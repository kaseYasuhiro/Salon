import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Edit, Trash2,
  Mail, Phone, Star, Clock, Award,
  Activity, Briefcase, CheckCircle, XCircle, Scissors, X, AlertCircle,
  Plus, Tag
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/auth-context';

function Employees() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [employees, setEmployees] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formError, setFormError] = useState('');
  const [specialtyError, setSpecialtyError] = useState('');
  const [isAddingSpecialty, setIsAddingSpecialty] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirmation: '',
    role: 'staff',
  });

  const [specialtyFormData, setSpecialtyFormData] = useState({
    staff_id: '',
    specialty_id: '',
    is_active: true
  });

  const [stats, setStats] = useState([
    { label: 'Total Staff', value: '0', icon: Users, bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
    { label: 'Active Staff', value: '0', icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600' },
  ]);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch staff feedbacks
  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get('/feedbacks/staff');
      console.log('Fetched staff feedbacks:', response.data);
      if (Array.isArray(response.data)) {
        setStaffFeedbacks(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff feedbacks:', error);
    }
  };

  // Fetch all available specialties from the specialties table
  const fetchSpecialtiesList = async () => {
    try {
      const response = await api.get('/specialties');
      console.log('Available specialties:', response.data);
      if (Array.isArray(response.data)) {
        setSpecialtiesList(response.data);
      }
    } catch (error) {
      console.error('Error fetching specialties list:', error);
    }
  };

  // Fetch employees with their specialties using the /employee/specialties endpoint
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/employee/specialties');
      console.log('Fetched employees with specialties:', response.data);
      
      if (Array.isArray(response.data)) {
        setEmployees(response.data);
        
        const activeEmployees = response.data.filter(e => e.status === 'active' || e.status === null).length;
        
        setStats([
          { ...stats[0], value: response.data.length.toString() },
          { ...stats[1], value: activeEmployees.toString() },
        ]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSpecialtiesList();
    fetchStaffFeedbacks();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleSpecialtyInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSpecialtyFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    setSpecialtyError('');
  };

  // Get specialty name by ID
  const getSpecialtyName = (specialtyId) => {
    const specialty = specialtiesList.find(s => s.id === specialtyId);
    return specialty ? specialty.specialty_name : 'Unknown';
  };

  // Get average rating for a staff member
  const getAverageStaffRating = (staffId) => {
    const staffReviews = staffFeedbacks.filter(f => f.staff_id === staffId);
    if (staffReviews.length === 0) return 0;
    
    const total = staffReviews.reduce((sum, feedback) => {
      const rating = typeof feedback.rating === 'number' ? feedback.rating : parseFloat(feedback.rating) || 0;
      return sum + rating;
    }, 0);
    
    return parseFloat((total / staffReviews.length).toFixed(1));
  };

  // Get review count for a staff member
  const getStaffReviewCount = (staffId) => {
    return staffFeedbacks.filter(f => f.staff_id === staffId).length;
  };

  // Render stars for rating display
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} size={12} className="fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half-star" size={12} className="fill-yellow-400 text-yellow-400" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} size={12} className="text-gray-300" />);
    }
    return stars;
  };

  // Add specialty for employee
  const handleAddSpecialty = async (e) => {
    e.preventDefault();
    
    if (!specialtyFormData.specialty_id) {
      setSpecialtyError('Please select a specialty');
      return;
    }

    setIsAddingSpecialty(true);
    try {
      await api.post('/employees/specialty/add', {
        staff_id: parseInt(specialtyFormData.staff_id),
        specialty_id: parseInt(specialtyFormData.specialty_id),
        is_active: specialtyFormData.is_active ? 1 : 0
      });
      
      showToast('Specialty assigned successfully!', 'success');
      setShowSpecialtyModal(false);
      setSelectedEmployee(null);
      resetSpecialtyForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error adding specialty:', error);
      setSpecialtyError(error.response?.data?.message || 'Error adding specialty');
      showToast(error.response?.data?.message || 'Error adding specialty', 'error');
    } finally {
      setIsAddingSpecialty(false);
    }
  };

  // Add employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email || 
        !formData.phone_number || !formData.password || !formData.password_confirmation) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setFormError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/register', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: 'staff'
      });
      
      showToast('Staff member added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      if (error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        setFormError(errors.join(', '));
      } else {
        setFormError('Error adding employee. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update employee
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone_number) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`/employees/update/${editingEmployee.id}`, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: formData.role,
      });
      
      showToast(response.data.message || 'Staff member updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      setFormError(error.response?.data?.message || 'Error updating employee');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await api.post(`/employees/delete/${id}`);
        showToast(response.data.message || 'Staff member deleted successfully!', 'success');
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        showToast(error.response?.data?.message || 'Error deleting employee', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirmation: '',
      role: 'staff',
    });
    setEditingEmployee(null);
    setFormError('');
  };

  const resetSpecialtyForm = () => {
    setSpecialtyFormData({
      staff_id: '',
      specialty_id: '',
      is_active: true
    });
    setSpecialtyError('');
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone_number: employee.phone_number,
      password: '',
      password_confirmation: '',
      role: employee.role,
    });
    setShowModal(true);
  };

  const handleEmployeeClick = (employee) => {
    console.log('Selected employee:', employee);
    console.log('Staff specialties:', employee.staff_specialties);
    setSelectedEmployee(employee);
    setSpecialtyFormData({
      staff_id: employee.id,
      specialty_id: '',
      is_active: true
    });
    setShowSpecialtyModal(true);
  };

  const handleSubmit = (e) => {
    if (editingEmployee) {
      handleUpdateEmployee(e);
    } else {
      handleAddEmployee(e);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const filteredEmployees = employees.filter(emp => {
    if (searchTerm && !`${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getSpecialtyIcon = (specialtyName) => {
    const name = specialtyName?.toLowerCase();
    if (name === 'stylist') return <Scissors size={10} />;
    if (name === 'barber') return <Scissors size={10} />;
    if (name === 'nail_technician') return <Briefcase size={10} />;
    if (name === 'massage_therapist') return <Activity size={10} />;
    if (name === 'makeup_artist') return <Star size={10} />;
    if (name === 'esthetician') return <Award size={10} />;
    return <Star size={10} />;
  };

  const formatSpecialtyName = (specialtyName) => {
    if (!specialtyName) return '';
    return specialtyName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading staff members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
            <div className={`${stat.bgColor} w-10 h-10 rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon className={stat.textColor} size={18} />
            </div>
            <p className="text-gray-500 text-xs mb-0.5">{stat.label}</p>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'grid' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'list' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            List View
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-40"
            />
          </div>
          
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
          >
            <UserPlus size={14} />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Grid View - Smaller Cards */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map((employee) => {
            const avgRating = getAverageStaffRating(employee.id);
            const reviewCount = getStaffReviewCount(employee.id);
            
            return (
              <div 
                key={employee.id} 
                onClick={() => handleEmployeeClick(employee)}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer group"
              >
                <div className="relative h-24 bg-gradient-to-r from-pink-50 to-purple-50 flex items-center justify-center">
                  <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl font-bold">
                      {getInitials(employee.first_name, employee.last_name)}
                    </span>
                  </div>
                  {employee.staff_specialties && employee.staff_specialties.length > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 bg-white rounded-full px-1.5 py-0.5 shadow-md">
                      <div className="flex items-center gap-0.5">
                        <Tag size={10} className="text-pink-500" />
                        <span className="text-[10px] font-medium text-gray-700">
                          {employee.staff_specialties.length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <div className="text-center mb-2">
                    <h3 className="text-sm font-semibold text-gray-800">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Users size={10} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Staff</span>
                    </div>
                  </div>
                  
                  {/* Rating Section */}
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(avgRating)}
                    </div>
                    {reviewCount > 0 && (
                      <span className="text-[10px] text-gray-500 ml-1">
                        ({avgRating.toFixed(1)} · {reviewCount})
                      </span>
                    )}
                    {reviewCount === 0 && (
                      <span className="text-[10px] text-gray-400 ml-1">No ratings</span>
                    )}
                  </div>
                  
                  <div className="mb-3 min-h-[36px]">
                    {employee.staff_specialties && employee.staff_specialties.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {employee.staff_specialties.slice(0, 2).map((specialty, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium"
                          >
                            {getSpecialtyIcon(specialty.specialties?.specialty_name)}
                            <span>{formatSpecialtyName(specialty.specialties?.specialty_name)}</span>
                          </span>
                        ))}
                        {employee.staff_specialties.length > 2 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                            +{employee.staff_specialties.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-[10px] text-gray-400 italic">No specialties</p>
                    )}
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Mail size={10} />
                      <span className="truncate text-[10px]">{employee.email}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                      <Phone size={10} />
                      <span className="text-[10px]">{employee.phone_number}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(employee);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-xs font-medium"
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEmployee(employee.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View - Compact */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Specialties</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((employee) => {
                  const avgRating = getAverageStaffRating(employee.id);
                  const reviewCount = getStaffReviewCount(employee.id);
                  
                  return (
                    <tr 
                      key={employee.id} 
                      onClick={() => handleEmployeeClick(employee)}
                      className="hover:bg-pink-50/30 transition-colors duration-200 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {getInitials(employee.first_name, employee.last_name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600">Staff</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5">
                            {renderStars(avgRating)}
                          </div>
                          {reviewCount > 0 && (
                            <span className="text-[10px] text-gray-500">
                              ({avgRating.toFixed(1)})
                            </span>
                          )}
                          {reviewCount === 0 && (
                            <span className="text-[10px] text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {employee.staff_specialties && employee.staff_specialties.length > 0 ? (
                            employee.staff_specialties.slice(0, 2).map((specialty, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium"
                              >
                                {getSpecialtyIcon(specialty.specialties?.specialty_name)}
                                <span>{formatSpecialtyName(specialty.specialties?.specialty_name)}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600 truncate max-w-[180px]">{employee.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600">{employee.phone_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(employee);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit size={14} className="text-gray-500" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEmployee(employee.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal - Compact */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0">
              <h2 className="text-lg font-bold text-white">
                {editingEmployee ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-red-600 text-xs">{formError}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              {!editingEmployee && (
                <>
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (editingEmployee ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Specialty Modal - Compact */}
      {showSpecialtyModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                Assign Specialty to {selectedEmployee.first_name}
              </h2>
              <button 
                onClick={() => {
                  setShowSpecialtyModal(false);
                  setSelectedEmployee(null);
                  resetSpecialtyForm();
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSpecialty} className="p-5 space-y-3">
              {specialtyError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-red-600 text-xs">{specialtyError}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Select Specialty *
                </label>
                <select
                  name="specialty_id"
                  value={specialtyFormData.specialty_id}
                  onChange={handleSpecialtyInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                >
                  <option value="">Select a specialty...</option>
                  {specialtiesList.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {formatSpecialtyName(specialty.specialty_name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={specialtyFormData.is_active}
                    onChange={handleSpecialtyInputChange}
                    className="w-3.5 h-3.5 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                  />
                  <span className="text-gray-700 text-xs font-semibold">
                    Active Status
                  </span>
                </label>
              </div>

              {selectedEmployee.staff_specialties && selectedEmployee.staff_specialties.length > 0 && (
                <div className="border-t border-gray-200 pt-3">
                  <label className="block text-gray-700 text-xs font-semibold mb-2">
                    Current Specialties
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmployee.staff_specialties.map((specialty, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-0.5 px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-xs"
                      >
                        {getSpecialtyIcon(specialty.specialties?.specialty_name)}
                        <span>{formatSpecialtyName(specialty.specialties?.specialty_name)}</span>
                        {specialty.is_active === 1 ? (
                          <CheckCircle size={10} className="text-green-500 ml-0.5" />
                        ) : (
                          <XCircle size={10} className="text-red-400 ml-0.5" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSpecialtyModal(false);
                    setSelectedEmployee(null);
                    resetSpecialtyForm();
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSpecialty}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                >
                  {isAddingSpecialty ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State - Smaller */}
      {filteredEmployees.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No staff members found</h3>
          <p className="text-sm text-gray-500 mb-3">Click "Add Staff" to add your first team member</p>
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
          >
            <UserPlus size={14} />
            <span>Add Staff</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Employees;