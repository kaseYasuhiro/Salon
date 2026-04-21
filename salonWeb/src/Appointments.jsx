import { useState } from 'react';
import { 
  Calendar, Scissors, Plus, Filter,
  ChevronLeft, ChevronRight, Search,
  User, Clock, Phone, Edit, Trash2, MoreVertical,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

function Appointments() {
  const [currentMonth, setCurrentMonth] = useState('December 2024');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState('calendar');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = [
    { label: 'Total Appointments', value: '179', change: '+12%', changeType: 'up', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', icon: Calendar },
    { label: "Today's Appointments", value: '8', change: '+2', changeType: 'up', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', icon: Clock },
    { label: 'Pending Appointments', value: '9', change: '-3', changeType: 'down', color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle },
    { label: 'Completed Appointments', value: '142', change: '+18%', changeType: 'up', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', icon: CheckCircle },
  ];

  const calendarData = [
    { day: 1, appointments: 2, status: 'busy', customers: ['John Doe - 10:00 AM', 'Jane Smith - 2:00 PM'] },
    { day: 2, appointments: 1, status: 'moderate', customers: ['Mike Johnson - 11:30 AM'] },
    { day: 3, appointments: 3, status: 'busy', customers: ['Sarah Wilson - 9:00 AM', 'Tom Brown - 1:00 PM', 'Lisa Anderson - 4:00 PM'] },
    { day: 4, appointments: 0, status: 'free', customers: [] },
    { day: 5, appointments: 2, status: 'moderate', customers: ['Emma Davis - 10:30 AM', 'James Lee - 3:00 PM'] },
    { day: 6, appointments: 4, status: 'busy', customers: ['Maria Garcia - 9:30 AM', 'Robert Kim - 11:00 AM', 'Patricia Martinez - 2:30 PM', 'Charles Taylor - 5:00 PM'] },
    { day: 7, appointments: 1, status: 'moderate', customers: ['Jennifer White - 1:30 PM'] },
    { day: 8, appointments: 2, status: 'busy', customers: ['William Harris - 10:00 AM', 'Linda Martin - 3:30 PM'] },
    { day: 9, appointments: 0, status: 'free', customers: [] },
    { day: 10, appointments: 3, status: 'busy', customers: ['Richard Thompson - 9:00 AM', 'Susan Moore - 12:00 PM', 'Daniel Jackson - 4:30 PM'] },
    { day: 11, appointments: 1, status: 'moderate', customers: ['Karen Lewis - 2:00 PM'] },
    { day: 12, appointments: 2, status: 'busy', customers: ['Steven Walker - 11:00 AM', 'Betty Hall - 3:00 PM'] },
    { day: 13, appointments: 0, status: 'free', customers: [] },
    { day: 14, appointments: 4, status: 'busy', customers: ['George Allen - 9:30 AM', 'Carol Young - 12:30 PM', 'Kenneth King - 2:30 PM', 'Donna Wright - 5:30 PM'] },
    { day: 15, appointments: 2, status: 'moderate', customers: ['Paul Scott - 10:00 AM', 'Ruth Green - 4:00 PM'] }
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const appointmentsList = [
    { id: 1, customer: 'John Doe', service: 'Haircut', date: 'Dec 15, 2024', time: '10:00 AM', staff: 'Emma', status: 'confirmed', phone: '+1 234 567 890', email: 'john@example.com' },
    { id: 2, customer: 'Jane Doe', service: 'Hair Rebound', date: 'Dec 15, 2024', time: '11:30 AM', staff: 'Lisa', status: 'confirmed', phone: '+1 234 567 891', email: 'jane@example.com' },
    { id: 3, customer: 'Maria Santos', service: 'Hair Color', date: 'Dec 16, 2024', time: '2:00 PM', staff: 'Nina', status: 'pending', phone: '+1 234 567 892', email: 'maria@example.com' },
    { id: 4, customer: 'Jerwin Buray', service: 'Full Treatment', date: 'Dec 16, 2024', time: '3:30 PM', staff: 'Tortor', status: 'confirmed', phone: '+1 234 567 893', email: 'jerwin@example.com' },
    { id: 5, customer: 'Sarah Johnson', service: 'Manicure', date: 'Dec 17, 2024', time: '4:00 PM', staff: 'Emma', status: 'completed', phone: '+1 234 567 894', email: 'sarah@example.com' },
    { id: 6, customer: 'Mike Rodriguez', service: 'Haircut + Beard', date: 'Dec 17, 2024', time: '5:30 PM', staff: 'Tortor', status: 'pending', phone: '+1 234 567 895', email: 'mike@example.com' },
    { id: 7, customer: 'Lisa Anderson', service: 'Hair Rebond', date: 'Dec 18, 2024', time: '9:00 AM', staff: 'Lisa', status: 'confirmed', phone: '+1 234 567 896', email: 'lisa@example.com' },
    { id: 8, customer: 'Tom Brown', service: 'Beard Trim', date: 'Dec 18, 2024', time: '1:00 PM', staff: 'Tortor', status: 'completed', phone: '+1 234 567 897', email: 'tom@example.com' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return <CheckCircle size={14} />;
      case 'pending': return <AlertCircle size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      default: return null;
    }
  };

  const getCalendarCellStyle = (status) => {
    switch(status) {
      case 'busy': return 'bg-pink-50 border-pink-200 hover:bg-pink-100';
      case 'moderate': return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'free': return 'bg-green-50 border-green-200 hover:bg-green-100';
      default: return 'bg-white border-gray-200 hover:bg-gray-50';
    }
  };

  const filteredAppointments = appointmentsList.filter(app => {
    if (selectedStatus !== 'all' && app.status !== selectedStatus) return false;
    if (searchTerm && !app.customer.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

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
          {/* Calendar Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold text-gray-800">{currentMonth}</h3>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight size={20} />
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

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-3 mb-4">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center font-semibold text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-3">
              {/* Empty cells for alignment */}
              {[0, 0, 0].map((_, index) => (
                <div key={`empty-${index}`} className="bg-gray-50 rounded-xl p-3 min-h-[110px] border border-gray-100"></div>
              ))}
              
              {/* Actual days */}
              {calendarData.map((day, index) => (
                <div 
                  key={index}
                  className={`${getCalendarCellStyle(day.status)} rounded-xl p-3 min-h-[110px] border transition-all duration-200 cursor-pointer hover:shadow-md`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold text-sm ${
                      day.status === 'busy' ? 'text-pink-700' : 
                      day.status === 'moderate' ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {day.day}
                    </span>
                    {day.appointments > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        day.status === 'busy' ? 'bg-pink-200 text-pink-800' : 
                        day.status === 'moderate' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                      }`}>
                        {day.appointments} app{day.appointments > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {day.appointments > 0 && (
                    <div className="space-y-1 mt-2">
                      <div className="text-xs text-gray-600 truncate">
                        {day.customers[0]}
                      </div>
                      {day.appointments > 1 && (
                        <div className="text-xs text-gray-400">
                          +{day.appointments - 1} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
                        <span className="text-sm font-medium text-gray-900">{appointment.customer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Scissors size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.service}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{appointment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{appointment.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{appointment.staff}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                        {getStatusIcon(appointment.status)}
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{appointment.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit size={16} className="text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-500">
              Showing {filteredAppointments.length} of {appointmentsList.length} appointments
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition-colors">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                3
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;