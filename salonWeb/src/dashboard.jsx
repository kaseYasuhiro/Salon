import { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { getToken } from '../services/auth-storage';

import { 
  Calendar, Scissors, Package, Users, 
  TrendingUp, CheckCircle, Clock, XCircle,
  Eye, LogOut, Menu, X, DollarSign,
  User, Phone, MapPin, Star, 
  ChevronRight, Activity, PieChart,
  AlertCircle, Bell, Search, Crown
} from 'lucide-react';
import { useAuth } from "../contexts/auth-context";

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Get token from storage
    const storedToken = getToken();
    setToken(storedToken);
    
    console.log('User from store:', user);
    console.log('Token from storage:', storedToken);
    
    // You can also check if user is authenticated
    if (!user || !storedToken) {
      // Redirect to login if not authenticated
      navigate('/');
    }
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Check if user is not authenticated
    if (!token || !user || (user.role !== 'admin' && user.role !== 'owner')) {
      navigate('/');
    }
  }, []);

  // Check current routes
  const isDashboardRoute = location.pathname === '/dashboard';
  const isAppointmentsRoute = location.pathname === '/dashboard/appointments';
  const isServicesRoute = location.pathname === '/dashboard/services';
  const isEmployeesRoute = location.pathname === '/dashboard/employees';
  const isInventoryRoute = location.pathname === '/dashboard/inventory';

  // Check if we should show the nested route content
  const isNestedRoute = isAppointmentsRoute || isServicesRoute || isEmployeesRoute || isInventoryRoute;

  const stats = [
    { label: 'Total Appointments', value: '179', icon: Calendar, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600', trend: '+12%' },
    { label: 'Active Services', value: '24', icon: Scissors, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-600', trend: '+5%' },
    { label: 'Inventory Items', value: '156', icon: Package, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-600', trend: '-3%' },
    { label: 'Staff Members', value: '8', icon: Users, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-600', trend: '+0%' },
  ];

  const weeklyRevenue = [12450, 18900, 15600, 22300, 19800, 25600, 18700];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxRevenue = Math.max(...weeklyRevenue);

  const appointmentStatus = [
    { label: 'Confirmed', count: 25, color: 'bg-green-500', icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-700' },
    { label: 'Pending', count: 9, color: 'bg-yellow-500', icon: Clock, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
    { label: 'Completed', count: 142, color: 'bg-blue-500', icon: CheckCircle, bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Cancelled', count: 3, color: 'bg-red-500', icon: XCircle, bgColor: 'bg-red-50', textColor: 'text-red-700' },
  ];

  const recentAppointments = [
    { customer: 'John Doe', service: 'Haircut', time: '10:00 AM', staff: 'Emma', status: 'Confirmed', rating: 5 },
    { customer: 'Jane Doe', service: 'Hair Rebound', time: '11:30 AM', staff: 'Lisa', status: 'Confirmed', rating: 4 },
    { customer: 'Maria Santos', service: 'Hair Color', time: '2:00 PM', staff: 'Nina', status: 'Pending', rating: null },
    { customer: 'Jerwin Buray', service: 'Full Hair Treatment', time: '3:30 PM', staff: 'Tortor', status: 'Confirmed', rating: 5 },
    { customer: 'Sarah Johnson', service: 'Manicure', time: '4:00 PM', staff: 'Emma', status: 'Completed', rating: 5 },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.log("Logout Error.", error);
      navigate('/');
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
                  Salon Pro
                </h2>
                <p className="text-xs text-gray-500 mt-1">Salon Management System</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Crown size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Logged in as</p>
                  <p className="text-sm font-semibold text-gray-800">Super Admin</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link 
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isDashboardRoute 
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Activity size={20} />
              <span>Dashboard</span>
            </Link>
            <Link 
              to="/dashboard/appointments"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isAppointmentsRoute 
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar size={20} />
              <span>Appointments</span>
            </Link>
            <Link 
              to="/dashboard/services"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isServicesRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Scissors size={20} />
              <span>Services</span>
            </Link>
            <Link 
              to="/dashboard/inventory"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === '/dashboard/inventory'
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Package size={20} />
              <span>Inventory</span>
            </Link>
            <Link 
              to="/dashboard/employees"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === '/dashboard/employees'
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={20} />
              <span>Employees</span>
            </Link>

          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-100">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all">
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-gray-100">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
                  <Menu size={24} className="text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    {isAppointmentsRoute && 'Appointments'}
                    {isServicesRoute && 'Services'}
                    {isEmployeesRoute && 'Employees'}
                    {isInventoryRoute && 'Inventory'}
                    {isDashboardRoute && 'Dashboard'}
                  </h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    {isAppointmentsRoute && 'Manage and schedule client appointments'}
                    {isServicesRoute && 'Browse and manage salon services'}
                    {isEmployeesRoute && 'Manage your team members'}
                    {isInventoryRoute && 'Track and manage salon inventory'}
                    {isDashboardRoute && 'Welcome Back! Here\'s Your Salon Overview'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">SA</span>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-gray-800">Super Admin</p>
                    <p className="text-xs text-gray-500">Owner</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area - This is where nested routes will render */}
        <main className="p-4 sm:p-6 lg:p-8">
          {isNestedRoute ? (
            <Outlet />
          ) : (
            // Dashboard Content (only show when on /dashboard)
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.bgColor} p-3 rounded-xl`}>
                        <stat.icon className={`${stat.textColor}`} size={24} />
                      </div>
                      <span className={`text-xs font-semibold ${stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'} bg-green-50 px-2 py-1 rounded-full`}>
                        {stat.trend}
                      </span>
                    </div>
                    <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Weekly Revenue */}
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Weekly Revenue</h3>
                      <p className="text-sm text-gray-500 mt-1">Last 7 days performance</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="text-green-500" size={20} />
                      <span className="text-sm font-semibold text-gray-700">Total: ₱132,500</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {weekDays.map((day, index) => (
                      <div key={day} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-600">{day}</span>
                          <span className="font-bold text-gray-800">₱{weeklyRevenue[index].toLocaleString()}</span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-pink-500 to-pink-600 h-3 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${(weeklyRevenue[index] / maxRevenue) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Appointment Status */}
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Appointment Status</h3>
                      <p className="text-sm text-gray-500 mt-1">Current overview</p>
                    </div>
                    <PieChart size={20} className="text-gray-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {appointmentStatus.map((status, index) => (
                      <div 
                        key={index} 
                        onClick={() => navigate('/dashboard/appointments')}
                        className={`${status.bgColor} rounded-xl p-4 transition-all hover:scale-105 duration-300 cursor-pointer`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`${status.color} p-2 rounded-lg text-white`}>
                            <status.icon size={16} />
                          </div>
                          <span className="text-2xl font-bold text-gray-800">{status.count}</span>
                        </div>
                        <p className={`${status.textColor} font-semibold text-sm`}>{status.label}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round((status.count / 179) * 100)}% of total
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Appointments Table */}
              <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Recent Appointments</h3>
                    <p className="text-sm text-gray-500 mt-1">Latest customer bookings</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search appointments..." 
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <Link 
                      to="/dashboard/appointments"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
                    >
                      <Eye size={16} />
                      <span>View All</span>
                    </Link>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {recentAppointments.map((appointment, index) => (
                        <tr 
                          key={index} 
                          onClick={() => navigate('/dashboard/appointments')}
                          className="hover:bg-pink-50/30 transition-colors duration-200 group cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <User size={14} className="text-pink-600" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-semibold text-gray-900">{appointment.customer}</p>
                              </div>
                            </div>
                           </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Scissors size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">{appointment.service}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">{appointment.time}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">{appointment.staff}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {appointment.rating && (
                              <div className="flex items-center gap-1">
                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-semibold text-gray-700">{appointment.rating}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Showing 5 of 179 appointments</p>
                    <Link 
                      to="/dashboard/appointments"
                      className="flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 font-medium"
                    >
                      <span>View All Appointments</span>
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;