import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, Edit, Mail, Phone, Star, Award,
  Activity, Briefcase, CheckCircle, XCircle, Scissors, X, AlertCircle,
  Tag, UserCheck, UserX, Save, DollarSign, Settings
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/auth-context';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:       { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  inactive:     { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  authorized:   { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  not_authorized:{ pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

function StatusPill({ status, label }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

function Panel({ title, subtitle, icon: Icon, iconClass = 'bg-pink-50 text-pink-500', action, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] transition-shadow duration-300 overflow-hidden ${className}`}>
      <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClass}`}>
              <Icon size={17} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, badge, badgeClass }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.08] bg-gradient-to-br ${color} group-hover:scale-125 transition-transform duration-500`} />
      <div className="relative flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
          <Icon size={20} className="text-white" />
        </div>
        {badge && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="relative text-xs font-medium text-slate-500 mt-4">{label}</p>
      <p className="relative text-3xl font-bold text-slate-800 mt-0.5 tracking-tight">{value}</p>
      {sub && <p className="relative text-[11px] text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
        <Icon size={26} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    type === 'info' ? { bar: 'bg-blue-500', icon: 'bg-blue-100 text-blue-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertCircle : type === 'info' ? AlertCircle : XCircle;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-100 p-3.5 pl-5 flex items-center gap-3 min-w-[300px] max-w-md overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent.bar}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${accent.icon}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-medium text-slate-700 flex-1">{message}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1 flex-shrink-0 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all';

const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function Employees() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [employees, setEmployees] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState([]);
  const [walkInAuthorizations, setWalkInAuthorizations] = useState({});
  const [walkInAuthIds, setWalkInAuthIds] = useState({});
  const [employeeCommissions, setEmployeeCommissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isSavingAll, setIsSavingAll] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    password: '', password_confirmation: '', role: 'staff',
  });

  const [employeeFormData, setEmployeeFormData] = useState({
    employee_id: '', specialty_id: '', active_status: true,
    commission_amount: '', walk_in_authorized: false,
  });

  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    authorizedCount: 0,
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.73:8000/api';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage/')) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/storage/${imagePath}`;
  };

  const getEmployeeProfileImage = (employee) => {
    if (!employee) return null;
    if (employee.user?.profile_image) return employee.user.profile_image;
    if (employee.profile_image) return employee.profile_image;
    return null;
  };

  const getEmployeeActiveStatus = (employee) => {
    if (!employee) return true;
    if (employee.user?.active_status != null) {
      return employee.user.active_status === 1 || employee.user.active_status === true;
    }
    if (employee.active_status != null) {
      return employee.active_status === 1 || employee.active_status === true;
    }
    return true;
  };

  const sortEmployeesByRecent = (employeesArray) =>
    [...employeesArray].sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      if (a.id && b.id) return b.id - a.id;
      return 0;
    });

  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get('/feedbacks/staff');
      if (Array.isArray(response.data)) setStaffFeedbacks(response.data);
    } catch {}
  };

  const fetchSpecialtiesList = async () => {
    try {
      const response = await api.get('/specialties');
      if (Array.isArray(response.data)) setSpecialtiesList(response.data);
    } catch {}
  };

  const fetchEmployeeCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      const commissionMap = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(item => { commissionMap[item.employee_id] = item.commission_amount; });
      }
      setEmployeeCommissions(commissionMap);
    } catch {}
  };

  const fetchWalkInAuthorizations = async () => {
    try {
      setIsRefreshing(true);
      const response = await api.get('/walk-in/staff');
      if (Array.isArray(response.data)) {
        const authMap = {}, authIdMap = {};
        let authorizedCount = 0;
        const latestAuths = {};
        response.data.forEach(auth => {
          const staffId = auth.staff_id || auth.staffId;
          if (!staffId) return;
          if (!latestAuths[staffId] || auth.id > latestAuths[staffId].id) latestAuths[staffId] = auth;
        });
        Object.values(latestAuths).forEach(auth => {
          const isAuthorized = auth.isAuthorizedForWalkIn === 1 || auth.isAuthorizedForWalkin === 1;
          const staffId = auth.staff_id || auth.staffId;
          if (staffId) {
            authMap[staffId] = isAuthorized;
            authIdMap[staffId] = auth.id;
            if (isAuthorized) authorizedCount++;
          }
        });
        setWalkInAuthorizations(authMap);
        setWalkInAuthIds(authIdMap);
        setStats(prev => ({ ...prev, authorizedCount }));
      }
    } catch {} finally {
      setIsRefreshing(false);
    }
  };

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/employee/specialties');
      if (Array.isArray(response.data)) {
        const sortedEmployees = sortEmployeesByRecent(response.data);
        setEmployees(sortedEmployees);
        const activeEmployees = sortedEmployees.filter(e => getEmployeeActiveStatus(e)).length;
        setStats(prev => ({
          ...prev,
          totalStaff: sortedEmployees.length,
          activeStaff: activeEmployees,
        }));
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = async () => {
    await Promise.all([
      fetchEmployees(),
      fetchWalkInAuthorizations(),
      fetchEmployeeCommissions(),
    ]);
  };

  useEffect(() => {
    refreshAllData();
    fetchSpecialtiesList();
    fetchStaffFeedbacks();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleEmployeeFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmployeeFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRemoveSpecialty = async (staffSpecialtyId) => {
    try {
      await api.delete(`/employees/specialty/${staffSpecialtyId}`);
      showToast('Specialty removed successfully.', 'success');
      await fetchEmployees();
      setSelectedEmployee(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          staff_specialties: prev.staff_specialties.filter(s => s.id !== staffSpecialtyId),
        };
      });
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to remove specialty.', 'error');
    }
  };

  const handleSaveAllChanges = async () => {
    if (!selectedEmployee) return;

    const hasSpecialty = employeeFormData.specialty_id;
    const hasCommission = employeeFormData.commission_amount && parseFloat(employeeFormData.commission_amount) > 0;
    const hasWalkIn = employeeFormData.walk_in_authorized !== undefined;
    const hasActiveStatus = employeeFormData.active_status !== undefined;

    if (!hasSpecialty && !hasCommission && !hasWalkIn && !hasActiveStatus) {
      return showToast('No changes to save. Please add a specialty, commission, or update active status.', 'info');
    }

    if (hasSpecialty) {
      const alreadyHasIt = selectedEmployee.staff_specialties?.some(
        s => s.specialty_id === parseInt(employeeFormData.specialty_id) && s.is_active === 1
      );
      if (alreadyHasIt) return showToast('This employee already has that specialty active.', 'warning');
    }

    if (hasCommission && parseFloat(employeeFormData.commission_amount) <= 0) {
      return showToast('Commission amount must be greater than 0.', 'error');
    }

    setIsSavingAll(true);
    try {
      // Convert whole-number percentage to decimal for the backend
      const commissionDecimal = hasCommission
        ? parseFloat(employeeFormData.commission_amount) / 100
        : null;

      const updateData = {
        employee_id: selectedEmployee.id,
        specialty_id: hasSpecialty ? parseInt(employeeFormData.specialty_id) : null,
        active_status: hasActiveStatus ? employeeFormData.active_status : null,
        commission_amount: commissionDecimal,
        walk_in_authorized: hasWalkIn ? employeeFormData.walk_in_authorized : null,
      };

      const response = await api.post('/employees/update-all', updateData);

      if (response.data.success) {
        showToast(response.data.message, 'success');
        setEmployeeFormData({
          employee_id: selectedEmployee.id,
          specialty_id: '',
          active_status: employeeFormData.active_status,
          commission_amount: '',
          walk_in_authorized: false,
        });
        await refreshAllData();
      } else {
        showToast(response.data.message || 'Some changes could not be saved.', 'warning');
        await refreshAllData();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error saving changes. Please try again.', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const getAverageStaffRating = (staffId) => {
    const staffReviews = staffFeedbacks.filter(f => f.staff_id === staffId);
    if (staffReviews.length === 0) return 0;
    const total = staffReviews.reduce((sum, fb) => {
      const rating = typeof fb.rating === 'number' ? fb.rating : parseFloat(fb.rating) || 0;
      return sum + rating;
    }, 0);
    return parseFloat((total / staffReviews.length).toFixed(1));
  };

  const getStaffReviewCount = (staffId) => staffFeedbacks.filter(f => f.staff_id === staffId).length;

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} size={12} className="fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) stars.push(<Star key="half-star" size={12} className="fill-yellow-400 text-yellow-400" />);
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} size={12} className="text-slate-300" />);
    }
    return stars;
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email ||
        !formData.phone_number || !formData.password || !formData.password_confirmation) {
      return setFormError('Please fill in all required fields');
    }
    if (formData.password !== formData.password_confirmation) return setFormError('Passwords do not match');
    if (formData.password.length < 6) return setFormError('Password must be at least 6 characters');

    setIsLoading(true);
    try {
      await api.post('/register', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: 'staff',
      });
      showToast('Staff member added successfully!', 'success');
      setShowModal(false);
      resetForm();
      refreshAllData();
    } catch (error) {
      const msg = error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Error adding employee. Please try again.');
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone_number) {
      return setFormError('Please fill in all required fields');
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
      refreshAllData();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error updating employee');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', email: '', phone_number: '',
      password: '', password_confirmation: '', role: 'staff',
    });
    setEditingEmployee(null);
    setFormError('');
  };

  const resetEmployeeForm = () => {
    setEmployeeFormData({
      employee_id: '', specialty_id: '', active_status: true,
      commission_amount: '', walk_in_authorized: false,
    });
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone_number: employee.phone_number,
      password: '', password_confirmation: '',
      role: employee.role,
    });
    setShowModal(true);
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    // Display stored decimal commission as a whole-number percentage
    const storedCommission = employeeCommissions[employee.id];
    setEmployeeFormData({
      employee_id: employee.id,
      specialty_id: '',
      active_status: getEmployeeActiveStatus(employee),
      commission_amount: storedCommission ? (storedCommission * 100).toString() : '',
      walk_in_authorized: walkInAuthorizations[employee.id] || false,
    });
    setShowEmployeeModal(true);
  };

  const handleSubmit = (e) => editingEmployee ? handleUpdateEmployee(e) : handleAddEmployee(e);

  const getInitials = (firstName, lastName) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  const filteredEmployees = employees.filter(emp => {
    if (searchTerm && !`${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getSpecialtyIcon = (specialtyName) => {
    const name = specialtyName?.toLowerCase();
    if (name === 'stylist' || name === 'barber') return <Scissors size={10} />;
    if (name === 'nail_technician') return <Briefcase size={10} />;
    if (name === 'massage_therapist') return <Activity size={10} />;
    if (name === 'makeup_artist') return <Star size={10} />;
    if (name === 'esthetician') return <Award size={10} />;
    return <Star size={10} />;
  };

  const formatSpecialtyName = (specialtyName) => {
    if (!specialtyName) return '';
    return specialtyName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const availableSpecialtiesForDropdown = specialtiesList.filter(specialty => {
    if (!selectedEmployee) return true;
    const alreadyHasIt = selectedEmployee.staff_specialties?.some(
      s => s.specialty_id === specialty.id && s.is_active === 1
    );
    return !alreadyHasIt;
  });

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading staff members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Staff"
          value={stats.totalStaff}
          sub="All team members"
          icon={Users}
          color="from-pink-500 to-pink-600"
        />
        <StatCard
          label="Active Staff"
          value={stats.activeStaff}
          sub="Currently active"
          icon={CheckCircle}
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          label="Authorized for Receptionist"
          value={stats.authorizedCount}
          sub="With Access to all Appointments"
          icon={UserCheck}
          color="from-blue-500 to-blue-600"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          {['grid', 'list'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === mode ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'grid' ? 'Grid View' : 'List View'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent w-52 transition-all"
            />
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
          >
            <UserPlus size={14} />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200/70 p-8">
              <EmptyState
                icon={Users}
                title="No staff members found"
                subtitle={'Click "Add Staff" to add your first team member'}
                action={
                  <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
                  >
                    <UserPlus size={14} />
                    <span>Add Staff</span>
                  </button>
                }
              />
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              const avgRating = getAverageStaffRating(employee.id);
              const reviewCount = getStaffReviewCount(employee.id);
              const isAuthorized = walkInAuthorizations[employee.id] || false;
              const commission = employeeCommissions[employee.id] || 0;
              const imageUrl = getImageUrl(getEmployeeProfileImage(employee));
              const isActive = getEmployeeActiveStatus(employee);

              return (
                <div
                  key={employee.id}
                  onClick={() => handleEmployeeClick(employee)}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden cursor-pointer group relative transition-all duration-300 hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] hover:-translate-y-0.5 ${
                    isActive ? 'border-slate-200/70' : 'border-red-200 opacity-80'
                  }`}
                >
                  <div className={`relative h-32 p-3 ${isActive ? 'bg-gradient-to-br from-pink-500 to-fuchsia-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
                    <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="relative flex items-start justify-between">
                      {imageUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden ring-4 ring-white/30 shadow-lg group-hover:scale-105 transition-transform">
                          <img
                            src={imageUrl}
                            alt={`${employee.first_name} ${employee.last_name}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              if (parent) parent.innerHTML = `<div class="w-full h-full bg-white/20 flex items-center justify-center"><span class="text-white text-xl font-bold">${getInitials(employee.first_name, employee.last_name)}</span></div>`;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-4 ring-white/30 group-hover:scale-105 transition-transform">
                          <span className="text-white text-xl font-bold">
                            {getInitials(employee.first_name, employee.last_name)}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col items-end gap-1">
                        {employee.staff_specialties && employee.staff_specialties.length > 0 && (
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                            <Tag size={10} className="text-pink-500" />
                            <span className="text-[10px] font-bold text-slate-700">{employee.staff_specialties.length}</span>
                          </div>
                        )}
                        <div className="rounded-full px-1.5 py-0.5">
                          {!isActive ? (
                            <StatusPill status="inactive" label="Inactive" />
                          ) : isAuthorized ? (
                            <StatusPill status="authorized" label="Authorized" />
                          ) : (
                            <StatusPill status="not_authorized" label="Not Authorized" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-center mb-3">
                      <h3 className={`text-sm font-bold truncate ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Users size={11} className="text-slate-400" />
                        <span className="text-[11px] text-slate-500 font-medium">Staff</span>
                      </div>
                      {commission > 0 && (
                        <div className="inline-flex items-center justify-center gap-1 mt-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                          <DollarSign size={10} />
                          <span className="text-[10px] font-semibold">{(commission * 100).toFixed(0)}% Commission</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1 mb-3">
                      <div className="flex items-center gap-0.5">{renderStars(avgRating)}</div>
                      {reviewCount > 0 ? (
                        <span className="text-[10px] text-slate-500 ml-1 font-medium">
                          ({avgRating.toFixed(1)} · {reviewCount})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 ml-1">No ratings</span>
                      )}
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-3" />

                    <div className="mb-3 min-h-[36px]">
                      {employee.staff_specialties && employee.staff_specialties.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {employee.staff_specialties.slice(0, 2).map((specialty, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                isActive ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {getSpecialtyIcon(specialty.specialties?.specialty_name)}
                              <span>{formatSpecialtyName(specialty.specialties?.specialty_name)}</span>
                            </span>
                          ))}
                          {employee.staff_specialties.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium border border-slate-200">
                              +{employee.staff_specialties.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-[10px] text-slate-400 italic">No specialties</p>
                      )}
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg py-1 px-2">
                        <Mail size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate text-[10px]">{employee.email}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg py-1 px-2">
                        <Phone size={11} className="text-slate-400 flex-shrink-0" />
                        <span className="text-[10px]">{employee.phone_number}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEmployeeClick(employee); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-pink-600 bg-pink-50 border border-pink-100 rounded-xl hover:bg-pink-100 transition-colors"
                      >
                        <Settings size={13} />
                        Manage
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  {['Staff Member', 'Status', 'Receptionist', 'Commission', 'Rating', 'Specialties', 'Email', 'Phone', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-5 py-10">
                      <EmptyState icon={Users} title="No staff members found" subtitle={'Click "Add Staff" to add your first team member'} />
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => {
                    const avgRating = getAverageStaffRating(employee.id);
                    const reviewCount = getStaffReviewCount(employee.id);
                    const isAuthorized = walkInAuthorizations[employee.id] || false;
                    const commission = employeeCommissions[employee.id] || 0;
                    const imageUrl = getImageUrl(getEmployeeProfileImage(employee));
                    const isActive = getEmployeeActiveStatus(employee);

                    return (
                      <tr
                        key={employee.id}
                        className={`hover:bg-pink-50/40 transition-colors duration-200 ${!isActive ? 'opacity-75' : ''}`}
                      >
                        <td onClick={() => handleEmployeeClick(employee)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-pink-100 group-hover:scale-110 transition-transform">
                                <img
                                  src={imageUrl}
                                  alt={`${employee.first_name} ${employee.last_name}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const parent = e.target.parentElement;
                                    if (parent) parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center"><span class="text-white text-xs font-bold">${getInitials(employee.first_name, employee.last_name)}</span></div>`;
                                  }}
                                />
                              </div>
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-pink-100 ${isActive ? 'bg-gradient-to-br from-pink-500 to-pink-600' : 'bg-slate-400'}`}>
                                <span className="text-white text-xs font-bold">
                                  {getInitials(employee.first_name, employee.last_name)}
                                </span>
                              </div>
                            )}
                            <p className={`text-xs font-semibold ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                              {employee.first_name} {employee.last_name}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusPill status={isActive ? 'active' : 'inactive'} label={isActive ? 'Active' : 'Inactive'} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleEmployeeClick(employee)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                              isAuthorized
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1">
                              {isAuthorized ? <UserCheck size={11} /> : <UserX size={11} />}
                              {isAuthorized ? 'Authorized' : 'Not Authorized'}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${commission > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {commission > 0 ? `${(commission * 100).toFixed(0)}%` : 'None'}
                          </span>
                        </td>
                        <td onClick={() => handleEmployeeClick(employee)} className="px-4 py-3 whitespace-nowrap cursor-pointer">
                          <div className="flex items-center gap-1">
                            <div className="flex items-center gap-0.5">{renderStars(avgRating)}</div>
                            {reviewCount > 0 && <span className="text-[10px] text-slate-500">({avgRating.toFixed(1)})</span>}
                            {reviewCount === 0 && <span className="text-[10px] text-slate-400">—</span>}
                          </div>
                        </td>
                        <td onClick={() => handleEmployeeClick(employee)} className="px-4 py-3 cursor-pointer">
                          <div className="flex flex-wrap gap-1">
                            {employee.staff_specialties && employee.staff_specialties.length > 0 ? (
                              employee.staff_specialties.slice(0, 2).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    isActive ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {getSpecialtyIcon(specialty.specialties?.specialty_name)}
                                  <span>{formatSpecialtyName(specialty.specialties?.specialty_name)}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-600 truncate max-w-[180px]">{employee.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-600">{employee.phone_number}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEmployeeClick(employee)}
                              className="p-1.5 text-pink-600 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-colors"
                              title="Manage"
                            >
                              <Settings size={13} />
                            </button>
                            <button
                              onClick={() => handleEdit(employee)}
                              className="p-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Edit"
                            >
                              <Edit size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-5 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  {editingEmployee ? <Edit size={18} className="text-white" /> : <UserPlus size={18} className="text-white" />}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {editingEmployee ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h2>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-xs">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>First Name <span className="text-pink-500">*</span></label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Last Name <span className="text-pink-500">*</span></label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Email <span className="text-pink-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number <span className="text-pink-500">*</span></label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className={inputClass}
                  required
                />
              </div>

              {/* Password fields now always render, but are optional during edit */}
              <div>
                <label className={labelClass}>
                  Password {!editingEmployee && <span className="text-pink-500">*</span>}
                  {editingEmployee && <span className="text-xs text-slate-400 font-normal ml-1">(Leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={editingEmployee ? "Leave blank to keep current" : "Minimum 6 characters"}
                  className={inputClass}
                  required={!editingEmployee} 
                />
              </div>
              <div>
                <label className={labelClass}>
                  Confirm Password {!editingEmployee && <span className="text-pink-500">*</span>}
                </label>
                <input
                  type="password"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  className={inputClass}
                  required={!editingEmployee}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isLoading ? 'Saving...' : (editingEmployee ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Employee Modal */}
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Settings size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    Manage {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <p className="text-[11px] text-pink-100">Update specialty, commission, status & authorization</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  setSelectedEmployee(null);
                  resetEmployeeForm();
                }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Employee Info */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-4">
                  {getImageUrl(getEmployeeProfileImage(selectedEmployee)) ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shadow-lg ring-4 ring-white flex-shrink-0">
                      <img
                        src={getImageUrl(getEmployeeProfileImage(selectedEmployee))}
                        alt={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (parent) parent.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center"><span class="text-white text-xl font-bold">${getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}</span></div>`;
                        }}
                      />
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ring-4 ring-white flex-shrink-0 ${
                      getEmployeeActiveStatus(selectedEmployee) ? 'bg-gradient-to-br from-pink-500 to-pink-600' : 'bg-slate-400'
                    }`}>
                      <span className="text-white text-xl font-bold">
                        {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-base truncate">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail size={12} />
                        {selectedEmployee.email}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone size={12} />
                        {selectedEmployee.phone_number}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 border ${employeeFormData.active_status ? 'bg-emerald-50/70 border-emerald-100' : 'bg-red-50/70 border-red-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-500">Staff Status</p>
                        <p className={`text-sm font-semibold ${employeeFormData.active_status ? 'text-emerald-700' : 'text-red-700'}`}>
                          {employeeFormData.active_status ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <StatusPill status={employeeFormData.active_status ? 'active' : 'inactive'} label={employeeFormData.active_status ? 'Active' : 'Inactive'} />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer mt-3">
                      <input
                        type="checkbox"
                        name="active_status"
                        checked={employeeFormData.active_status}
                        onChange={handleEmployeeFormChange}
                        className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                      />
                      <span className="text-slate-700 font-medium text-xs">
                        {employeeFormData.active_status ? 'Click to deactivate this staff member' : 'Click to reactivate this staff member'}
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Deactivating will hide this staff from booking, Receptionist authorization, and assignment.
                    </p>
                  </div>

                  {employeeCommissions[selectedEmployee.id] > 0 && (
                    <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-100">
                      <p className="text-[11px] text-slate-500">Current Commission</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        {(employeeCommissions[selectedEmployee.id] * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}

                  <div className={`rounded-xl p-4 border ${walkInAuthorizations[selectedEmployee.id] ? 'bg-blue-50/70 border-blue-100' : 'bg-slate-50/70 border-slate-200'}`}>
                    <p className="text-[11px] text-slate-500">Receptionist Authorization</p>
                    <div className="mt-1">
                      <StatusPill
                        status={walkInAuthorizations[selectedEmployee.id] ? 'authorized' : 'not_authorized'}
                        label={walkInAuthorizations[selectedEmployee.id] ? 'Authorized' : 'Not Authorized'}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Add Specialty</h3>
                    <div>
                      <label className={labelClass}>Select Specialty</label>
                      <select
                        name="specialty_id"
                        value={employeeFormData.specialty_id}
                        onChange={handleEmployeeFormChange}
                        className={inputClass}
                      >
                        <option value="">Select a specialty...</option>
                        {availableSpecialtiesForDropdown.map((specialty) => (
                          <option key={specialty.id} value={specialty.id}>
                            {formatSpecialtyName(specialty.specialty_name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {selectedEmployee.staff_specialties && selectedEmployee.staff_specialties.length > 0 && (
                    <div className="border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Current Specialties
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEmployee.staff_specialties.map((specialty, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-700 rounded-lg text-[11px] font-medium border border-pink-100"
                          >
                            {getSpecialtyIcon(specialty.specialties?.specialty_name)}
                            <span>{formatSpecialtyName(specialty.specialties?.specialty_name)}</span>
                            {specialty.is_active === 1 ? (
                              <CheckCircle size={10} className="text-emerald-500 ml-0.5" />
                            ) : (
                              <XCircle size={10} className="text-red-400 ml-0.5" />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecialty(specialty.id)}
                              className="ml-1 text-red-500 hover:text-red-700 hover:bg-pink-200 rounded-full p-0.5 transition-colors"
                              title="Remove Specialty"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Commission</h3>
                    <div>
                      <label className={labelClass}>Commission Rate (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="commission_amount"
                          value={employeeFormData.commission_amount}
                          onChange={handleEmployeeFormChange}
                          step="1"
                          min="0"
                          max="100"
                          placeholder="e.g., 40 for 40%"
                          className={`${inputClass} pr-8`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Enter the whole number percentage (e.g., 40 for 40%)</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Receptionist Authorization</h3>
                    <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="walk_in_authorized"
                          checked={employeeFormData.walk_in_authorized}
                          onChange={handleEmployeeFormChange}
                          disabled={!employeeFormData.active_status}
                          className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 disabled:opacity-50"
                        />
                        <div>
                          <span className="text-slate-700 font-semibold text-sm">
                            {employeeFormData.walk_in_authorized ? 'Revoke Authorization' : 'Authorize for Receptionist'}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {!employeeFormData.active_status
                              ? 'Inactive staff cannot be authorized for Receptionist'
                              : employeeFormData.walk_in_authorized
                                ? 'Remove Receptionist access for this staff member'
                                : 'Allow this staff member to access and manage all appointments'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  onClick={handleSaveAllChanges}
                  disabled={isSavingAll}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSavingAll ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save All Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;