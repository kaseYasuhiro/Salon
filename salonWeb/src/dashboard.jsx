import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { getToken } from '../services/auth-storage';

import { 
  Calendar, Scissors, Package, Users, 
  TrendingUp, CheckCircle, Clock, XCircle,
  Eye, LogOut, Menu, X, 
  User, Phone, MapPin, Star, Award,
  ChevronRight, ChevronDown, Activity, PieChart,
  AlertCircle, Bell, Search, Crown,
  FileText,
  Box,
  BarChart3,
  Image as ImageIcon,
  Upload,
  CloudUpload,
  Loader
} from 'lucide-react';
import { useAuth } from "../contexts/auth-context";
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Helpers: group /all-appointments rows into one entry per appointment
// ─────────────────────────────────────────────────────────────

const groupByAppointment = (transactions) => {
  const map = new Map();
  transactions.forEach(tx => {
    const apptId = tx.appointment_id ?? tx.id;
    if (!apptId) return;
    if (!map.has(apptId)) {
      map.set(apptId, {
        appointment_id: apptId,
        id: tx.id,
        customer_name: tx.customer_name,
        customer_email: tx.customer_email,
        customer_phone: tx.customer_phone,
        appointment_date: tx.appointment_date,
        appointment_time: tx.appointment_time,
        status: tx.status,
        assigned_employee_id: tx.assigned_employee_id,
        billing_total_amount: tx.billing_total_amount != null
          ? parseFloat(tx.billing_total_amount) : null,
        billing_paid_amount: tx.billing_paid_amount != null
          ? parseFloat(tx.billing_paid_amount) : null,
        billing_balance: tx.billing_balance != null
          ? parseFloat(tx.billing_balance) : null,
        billing_payment_type: tx.billing_payment_type ?? null,
        services: [],
        priceSum: 0,
        durationSum: 0,
      });
    }
    const g = map.get(apptId);
    g.services.push({
      service_id: tx.service_id,
      service_name: tx.service_name,
      price: parseFloat(tx.price) || 0,
      duration_minutes: parseInt(tx.duration_minutes) || 0,
    });
    g.priceSum += parseFloat(tx.price) || 0;
    g.durationSum += parseInt(tx.duration_minutes) || 0;
  });
  return Array.from(map.values());
};

const getAppointmentRevenue = (appt) => {
  if (appt.billing_total_amount != null && appt.billing_total_amount > 0) {
    return appt.billing_total_amount;
  }
  return appt.priceSum || 0;
};

// ─────────────────────────────────────────────────────────────
// Toast — minimal, no dependencies. Auto-dismisses after 3s.
// ─────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : type === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-blue-50 border-blue-200 text-blue-800';

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle;

  return (
    <div className="fixed top-6 right-6 z-[100]">
      <div className={`flex items-start gap-3 min-w-[280px] max-w-md px-4 py-3 border rounded-xl shadow-lg ${styles}`}>
        <Icon size={18} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QR Code Modal — extracted so its internal form state
// doesn't re-render the whole Dashboard on every keystroke.
// ─────────────────────────────────────────────────────────────
function QrCodeModal({ open, qrData, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [gcashNumber, setGcashNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Seed the GCash number from existing data whenever the modal opens
  useEffect(() => {
    if (open) {
      setFile(null);
      setPreviewUrl(null);
      setGcashNumber(qrData?.gcash_number || '');
      setIsUploading(false);
    }
  }, [open, qrData?.gcash_number]);

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open) return null;

  const handlePickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(f.type)) {
      alert('Please upload a PNG or JPG image.');
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      alert('Image must be 4MB or smaller.');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert('Please select a QR code image.');
      return;
    }
    if (!/^09\d{9}$/.test(gcashNumber.trim())) {
      alert('GCash number must be 11 digits starting with 09 (e.g. 09171234567).');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('qr_image', file);
      formData.append('gcash_number', gcashNumber.trim());

      await api.post('/qr-code', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onUploaded?.();
    } catch (error) {
      console.error('Error uploading QR code:', error);
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join('\n')
        : error.response?.data?.message || 'Failed to upload QR code. Please try again.';
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {qrData?.qr_image ? 'Update Payment QR' : 'Upload Payment QR'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1"
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              QR Code Image <span className="text-pink-500">*</span>
            </label>

            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-pink-300 rounded-xl bg-pink-50 cursor-pointer hover:bg-pink-100 transition-colors">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="QR preview"
                  className="w-full h-full object-contain rounded-xl p-2"
                />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <CloudUpload size={32} className="text-pink-500 mb-2" />
                  <p className="text-sm font-medium text-pink-600">Click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">PNG or JPG, max 4MB</p>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handlePickImage}
                disabled={isUploading}
              />
            </label>

            {file && (
              <p className="text-xs text-gray-500 mt-2">
                Selected: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              GCash Number <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={gcashNumber}
              onChange={(e) =>
                setGcashNumber(e.target.value.replace(/\D/g, '').slice(0, 11))
              }
              placeholder="09171234567"
              maxLength={11}
              autoComplete="off"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={isUploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              11 digits, must start with 09
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 mb-5">
            <p className="text-xs text-blue-700">
              This QR code and GCash number will be shown to customers when they pay
              their downpayment or remaining balance.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  {qrData?.qr_image ? 'Update QR' : 'Upload QR'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
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

  // Appointment status counts
  const [appointmentStatusCounts, setAppointmentStatusCounts] = useState({
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });

  // Remittance states (kept — still used elsewhere in the app)
  const [remittances, setRemittances] = useState([]);
  const [weeklyRemittanceData, setWeeklyRemittanceData] = useState([]);
  const [totalWeeklyRemittance, setTotalWeeklyRemittance] = useState(0);

  // Performance states
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [servicePerformance, setServicePerformance] = useState([]);
  const [frequentCustomers, setFrequentCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [commissionsData, setCommissionsData] = useState([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);

  // ── QR Code / GCash state ──
  const [qrData, setQrData] = useState(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [toast, setToast] = useState(null);   // { message, type } | null

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

  // Auto-open transactions dropdown if on a transactions route
  useEffect(() => {
    const isTransactionsRoute = 
      location.pathname === '/dashboard/sales' || 
      location.pathname === '/dashboard/inventoryReports' || 
      location.pathname === '/dashboard/remittances';

    if (isTransactionsRoute) {
      setTransactionsOpen(true);
    }
  }, [location.pathname]);

  // ── Fetch all appointments ──
  const fetchAllAppointments = async () => {
    try {
      const response = await api.get('/all-appointments');
      console.log('All appointments (raw):', response.data);

      if (Array.isArray(response.data)) {
        const grouped = groupByAppointment(response.data);
        console.log('Grouped appointments:', grouped);

        const counts = { confirmed: 0, pending: 0, completed: 0, cancelled: 0 };
        grouped.forEach(appt => {
          if (appt.status === 'confirmed') counts.confirmed++;
          else if (appt.status === 'pending') counts.pending++;
          else if (appt.status === 'completed') counts.completed++;
          else if (appt.status === 'cancelled') counts.cancelled++;
        });
        setAppointmentStatusCounts(counts);

        const completed = grouped.filter(a => a.status === 'completed');
        setRecentCompletedAppointments(completed.slice(0, 5));

        setDashboardStats(prev => ({
          ...prev,
          totalAppointments: grouped.length,
        }));

        return grouped;
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  };

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

  const fetchStaffList = async () => {
    try {
      const response = await api.get('/staff-list');
      console.log('Staff list:', response.data);
      if (Array.isArray(response.data)) {
        setStaffList(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      console.log('Commissions:', response.data);
      if (Array.isArray(response.data)) {
        setCommissionsData(response.data);
      } else {
        setCommissionsData([]);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
      setCommissionsData([]);
    }
  };

  // ── QR Code fetcher ──
  const fetchQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await api.get('/qr-code');
      console.log('QR code:', response.data);
      setQrData(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching QR code:', error);
      setQrData(null);
      return null;
    } finally {
      setIsLoadingQr(false);
    }
  };

  const getEmployeeCommissionRate = (employeeId) => {
    const commission = commissionsData.find(c => c.employee_id === employeeId);
    return commission ? parseFloat(commission.commission_amount) : 0;
  };

  // ── Staff performance ──
  const calculateStaffPerformance = (groupedAppointments) => {
    const staffMap = {};

    groupedAppointments.forEach(appt => {
      const staffId = appt.assigned_employee_id;
      if (!staffId) return;

      if (!staffMap[staffId]) {
        const staff = staffList.find(s => s.id === staffId);
        staffMap[staffId] = {
          staff_id: staffId,
          staff_name: staff?.name || `Staff ${staffId}`,
          totalRevenue: 0,
          appointmentCount: 0,
          totalCommission: 0,
          commissionRate: getEmployeeCommissionRate(staffId),
        };
      }

      staffMap[staffId].totalRevenue += getAppointmentRevenue(appt);
      staffMap[staffId].appointmentCount += 1;

      const rate = staffMap[staffId].commissionRate;
      appt.services.forEach(svc => {
        staffMap[staffId].totalCommission += (svc.price || 0) * rate;
      });
    });

    return Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  // ── Service performance ──
  const calculateServicePerformance = (serviceRows) => {
    const serviceMap = {};

    serviceRows.forEach(row => {
      const serviceName = row.service_name || 'Unknown Service';
      if (!serviceMap[serviceName]) {
        serviceMap[serviceName] = {
          service_name: serviceName,
          totalRevenue: 0,
          count: 0
        };
      }
      serviceMap[serviceName].totalRevenue += parseFloat(row.price) || 0;
      serviceMap[serviceName].count += 1;
    });

    return Object.values(serviceMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const fetchPerformanceData = async () => {
    setIsLoadingPerformance(true);
    try {
      const response = await api.get('/all-appointments');

      if (Array.isArray(response.data)) {
        const grouped = groupByAppointment(response.data);
        const completedGrouped = grouped.filter(a => a.status === 'completed');

        setStaffPerformance(calculateStaffPerformance(completedGrouped));

        const serviceRows = [];
        completedGrouped.forEach(appt => {
          appt.services.forEach(svc => {
            serviceRows.push({
              service_name: svc.service_name,
              price: svc.price,
            });
          });
        });
        setServicePerformance(calculateServicePerformance(serviceRows));
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const fetchFrequentCustomers = async () => {
    try {
      const appointmentsResponse = await api.get('/all-appointments');
      const walkInsResponse = await api.get('/walk-in');

      const customerMap = {};

      if (Array.isArray(appointmentsResponse.data)) {
        const grouped = groupByAppointment(appointmentsResponse.data);

        // ✅ Only count COMPLETED appointments toward "Top Customers"
        const completedAppointments = grouped.filter(appt => appt.status === 'completed');

        completedAppointments.forEach(appt => {
          const customerName = appt.customer_name || 'Unknown Customer';
          const key = customerName;

          if (!customerMap[key]) {
            customerMap[key] = {
              name: customerName,
              email: appt.customer_email || 'N/A',
              phone: appt.customer_phone || 'N/A',
              totalVisits: 0,
              totalSpent: 0,
              lastVisit: appt.appointment_date || null,
              type: 'Appointment'
            };
          }

          customerMap[key].totalVisits += 1;
          customerMap[key].totalSpent += getAppointmentRevenue(appt);

          if (appt.appointment_date) {
            if (!customerMap[key].lastVisit || appt.appointment_date > customerMap[key].lastVisit) {
              customerMap[key].lastVisit = appt.appointment_date;
            }
          }
        });
      }

      if (Array.isArray(walkInsResponse.data)) {
        walkInsResponse.data.forEach(walkIn => {
          const customerName = walkIn.customer_name || 'Walk-in Customer';
          const key = customerName;

          if (!customerMap[key]) {
            customerMap[key] = {
              name: customerName,
              email: 'N/A',
              phone: 'N/A',
              totalVisits: 0,
              totalSpent: 0,
              lastVisit: walkIn.created_at ? walkIn.created_at.split('T')[0] : null,
              type: 'Walk-in'
            };
          }

          customerMap[key].totalVisits += 1;
          customerMap[key].totalSpent += walkIn.amount_paid || 0;

          if (walkIn.created_at) {
            const visitDate = walkIn.created_at.split('T')[0];
            if (!customerMap[key].lastVisit || visitDate > customerMap[key].lastVisit) {
              customerMap[key].lastVisit = visitDate;
            }
          }
        });
      }

      const customersArray = Object.values(customerMap)
        .sort((a, b) => b.totalVisits - a.totalVisits || b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setFrequentCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching frequent customers:', error);
    }
  };

  const processWeeklyRemittances = (data) => {
    const days = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

    const total = days.reduce((sum, day) => sum + day.amount, 0);
    setTotalWeeklyRemittance(total);
  };

  const getFeedbackForAppointment = (appointmentId) => {
    return feedbacks.find(f => f.appointment_id === appointmentId);
  };

  // ── QR modal callbacks (memoized so QrCodeModal doesn't re-render unnecessarily) ──
  const handleQrClose = useCallback(() => {
    setIsQrModalOpen(false);
  }, []);

  const handleQrUploaded = useCallback(async () => {
    await fetchQrCode();
    setIsQrModalOpen(false);
    setToast({ message: 'QR code updated successfully!', type: 'success' });
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAllAppointments(),
        fetchServices(),
        fetchInventory(),
        fetchStaff(),
        fetchFeedbacks(),
        fetchRemittances(),
        fetchStaffList(),
        fetchCommissions(),
        fetchQrCode(),
      ]);
      setIsLoading(false);
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (staffList.length > 0 || commissionsData.length > 0) {
      fetchPerformanceData();
      fetchFrequentCustomers();
    }
  }, [staffList, commissionsData]);

  // ── Route checks ──
  const isDashboardRoute = location.pathname === '/dashboard';
  const isAppointmentsRoute = location.pathname === '/dashboard/appointments' || location.pathname === '/dashboard/appointments/list' || location.pathname.startsWith('/dashboard/appointments/');
  const isServicesRoute = location.pathname === '/dashboard/services';
  const isEmployeesRoute = location.pathname === '/dashboard/employees';
  const isInventoryRoute = location.pathname === '/dashboard/inventory';
  const isReportsRoute = location.pathname === '/dashboard/reports';
  const isProductsRoute = location.pathname === '/dashboard/products';

  const isSalesRoute = location.pathname === '/dashboard/sales';
  const isInventoryReportsRoute = location.pathname === '/dashboard/inventoryReports';
  const isRemittancesRoute = location.pathname === '/dashboard/remittances';
  const isAnyTransactionsRoute = isSalesRoute || isInventoryReportsRoute || isRemittancesRoute;

  const isNestedRoute = isAppointmentsRoute || isServicesRoute || isEmployeesRoute || isInventoryRoute || isReportsRoute || isProductsRoute || isAnyTransactionsRoute;

  const stats = [
    { label: 'Total Appointments', value: dashboardStats.totalAppointments.toString(), icon: Calendar, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-600', trend: '+12%' },
    { label: 'Active Services', value: dashboardStats.activeServices.toString(), icon: Scissors, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-600', trend: '+5%' },
    { label: 'Inventory Items', value: dashboardStats.inventoryItems.toString(), icon: Package, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-600', trend: '-3%' },
    { label: 'Staff Members', value: dashboardStats.staffMembers.toString(), icon: Users, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-600', trend: '+0%' },
  ];

  const getAppointmentStatusCounts = () => {
    const total = dashboardStats.totalAppointments || 1;

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

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  // ── Appointment modal (inline — fine because it's only shown on click) ──
  const AppointmentModal = () => {
    if (!selectedAppointment) return null;

    const services = selectedAppointment.services || [];
    const grandTotal = selectedAppointment.billing_total_amount
      ?? selectedAppointment.priceSum
      ?? 0;
    const paidAmount = selectedAppointment.billing_paid_amount ?? 0;
    const balance = selectedAppointment.billing_balance ?? (grandTotal - paidAmount);
    const serviceNames = services.map(s => s.service_name).join(' + ') || 'N/A';
    const durationSum = selectedAppointment.durationSum ?? 0;

    const feedback = getFeedbackForAppointment(selectedAppointment.id)
      || getFeedbackForAppointment(selectedAppointment.appointment_id);

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

            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-pink-500" />
                Appointment Details
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Service{services.length > 1 ? 's' : ''}:</span> {serviceNames}
                </p>
                {services.length > 1 && (
                  <div className="pl-3 space-y-0.5">
                    {services.map((svc, idx) => (
                      <p key={idx} className="text-xs text-gray-600">
                        • {svc.service_name} — ₱{svc.price.toLocaleString()} ({svc.duration_minutes} mins)
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Date:</span> {formatDate(selectedAppointment.appointment_date)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Time:</span> {formatTime(selectedAppointment.appointment_time)}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Duration:</span> {durationSum} mins
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </p>
              </div>
            </div>

            {/* ✅ Payment section — ₱ glyph instead of DollarSign icon */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-[16px] text-center font-bold text-base leading-none text-pink-500">₱</span>
                Payment
              </h3>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p className="text-sm text-gray-700 flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-pink-600 font-bold">₱{grandTotal.toLocaleString()}</span>
                </p>
                <p className="text-sm text-gray-700 flex justify-between">
                  <span className="font-medium">Paid:</span>
                  <span className="text-green-600 font-semibold">₱{paidAmount.toLocaleString()}</span>
                </p>
                <p className="text-sm text-gray-700 flex justify-between">
                  <span className="font-medium">Balance:</span>
                  <span className={`font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {balance > 0 ? `₱${balance.toLocaleString()}` : 'Paid in Full'}
                  </span>
                </p>
              </div>
            </div>

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

  const renderDashboardContent = () => (
    <>
      {/* Stats Grid */}
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
        {/* Payment QR Code */}
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Payment QR Code</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Shown to customers for downpayments & balances
              </p>
            </div>
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:shadow-md transition-all"
            >
              <Upload size={12} />
              <span>{qrData?.qr_image ? 'Change' : 'Upload'}</span>
            </button>
          </div>

          {isLoadingQr ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={24} className="text-pink-500 animate-spin" />
            </div>
          ) : !qrData?.qr_image ? (
            <div
              onClick={() => setIsQrModalOpen(true)}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-pink-200 rounded-lg bg-pink-50/50 cursor-pointer hover:bg-pink-50 transition-colors"
            >
              <ImageIcon size={32} className="text-pink-400 mb-2" />
              <p className="text-xs font-medium text-pink-600">No QR code uploaded yet</p>
              <p className="text-[10px] text-gray-500 mt-1">Click to upload one</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="bg-white p-3 rounded-xl border-2 border-pink-200 shadow-sm">
                <img
                  src={qrData.qr_image}
                  alt="Payment QR"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px] text-gray-500">GCash Number</p>
                <p className="text-sm font-bold text-gray-800 tracking-wide">
                  {qrData.gcash_number || 'Not set'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Appointment Status */}
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

      {/* Performance Row - Service & Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Service Performance */}
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-pink-50 p-1.5 rounded-lg">
                <Scissors size={14} className="text-pink-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Service Performance</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Top performing services</p>
              </div>
            </div>
            <Link 
              to="/dashboard/sales"
              className="flex items-center gap-0.5 text-[10px] text-pink-600 hover:text-pink-700 font-medium"
            >
              <span>View All</span>
              <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-4">
            {isLoadingPerformance ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : servicePerformance.length === 0 ? (
              <div className="text-center py-8">
                <Scissors size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No service data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {servicePerformance.slice(0, 5).map((service, index) => {
                  const maxRevenue = servicePerformance[0]?.totalRevenue || 1;
                  const percentage = (service.totalRevenue / maxRevenue) * 100;

                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            index === 0 ? 'bg-yellow-100' :
                            index === 1 ? 'bg-gray-100' :
                            index === 2 ? 'bg-orange-100' :
                            'bg-pink-50'
                          }`}>
                            <Scissors size={11} className={
                              index === 0 ? 'text-yellow-600' :
                              index === 1 ? 'text-gray-600' :
                              index === 2 ? 'text-orange-600' :
                              'text-pink-500'
                            } />
                          </div>
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {service.service_name}
                          </p>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-xs font-bold text-gray-800">
                            {formatCurrency(service.totalRevenue)}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {service.count} booking{service.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-700 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                            'bg-gradient-to-r from-pink-400 to-pink-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-50 p-1.5 rounded-lg">
                <Users size={14} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Staff Performance</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Top performing staff</p>
              </div>
            </div>
            <Link 
              to="/dashboard/sales"
              className="flex items-center gap-0.5 text-[10px] text-green-600 hover:text-green-700 font-medium"
            >
              <span>View All</span>
              <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-4">
            {isLoadingPerformance ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : staffPerformance.length === 0 ? (
              <div className="text-center py-8">
                <Users size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No staff data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffPerformance.slice(0, 5).map((staff, index) => {
                  const maxRevenue = staffPerformance[0]?.totalRevenue || 1;
                  const percentage = (staff.totalRevenue / maxRevenue) * 100;
                  const initials = staff.staff_name.split(' ').map(n => n[0]).join('').slice(0, 2);

                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                            'bg-gradient-to-r from-green-400 to-green-500'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {staff.staff_name}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {staff.appointmentCount} appointment{staff.appointmentCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-xs font-bold text-gray-800">
                            {formatCurrency(staff.totalRevenue)}
                          </p>
                          <p className="text-[10px] text-yellow-600 font-semibold">
                            {formatCurrency(staff.totalCommission || 0)} comm.
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-700 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                            'bg-gradient-to-r from-green-400 to-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-50 p-1.5 rounded-lg">
              <Users size={14} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Top Customers</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Most frequent customers</p>
            </div>
          </div>
          <Link 
            to="/dashboard/sales"
            className="flex items-center gap-0.5 text-[10px] text-yellow-600 hover:text-yellow-700 font-medium"
          >
            <span>View All</span>
            <ChevronRight size={12} />
          </Link>
        </div>
        <div className="p-4">
          {isLoadingPerformance ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : frequentCustomers.length === 0 ? (
            <div className="text-center py-8">
              <User size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No customer data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {frequentCustomers.map((customer, index) => (
                <div 
                  key={customer.name} 
                  className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                    index === 0 ? 'bg-yellow-50 border-yellow-200' : 
                    index === 1 ? 'bg-gray-50 border-gray-200' : 
                    index === 2 ? 'bg-amber-50 border-amber-200' : 
                    'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                      'bg-gradient-to-r from-pink-400 to-pink-500'
                    }`}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {customer.name}
                        </p>
                        {index === 0 && <Award size={12} className="text-yellow-500 flex-shrink-0" />}
                        {index === 1 && <Award size={12} className="text-gray-400 flex-shrink-0" />}
                        {index === 2 && <Award size={12} className="text-amber-600 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span>{customer.totalVisits} visit{customer.totalVisits > 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-[10px] text-green-600 font-semibold">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        Last: {formatDate(customer.lastVisit)}
                      </p>
                      <span className={`mt-1 inline-block px-1.5 py-0.5 text-[9px] font-medium rounded-full ${
                        customer.type === 'Walk-in' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {customer.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Appointments Table */}
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
                  const feedback = getFeedbackForAppointment(appointment.id)
                    || getFeedbackForAppointment(appointment.appointment_id);
                  const serviceNames = (appointment.services || [])
                    .map(s => s.service_name)
                    .join(' + ') || 'N/A';

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
                          <span className="text-xs text-gray-600 truncate max-w-[200px]">
                            {serviceNames}
                          </span>
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
      {showModal && <AppointmentModal />}

      <QrCodeModal
        open={isQrModalOpen}
        qrData={qrData}
        onClose={handleQrClose}
        onUploaded={handleQrUploaded}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                isEmployeesRoute
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              <span>Employees</span>
            </Link>
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
              <span>Incidents</span>
            </Link>

            {/* Transactions Dropdown */}
            <div>
              <button
                onClick={() => setTransactionsOpen(!transactionsOpen)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isAnyTransactionsRoute
                    ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart3 size={18} />
                <span className="flex-1 text-left">Transactions</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${transactionsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  transactionsOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="ml-4 pl-3 border-l-2 border-pink-200 space-y-0.5">
                  {/* ✅ Income link — ₱ glyph */}
                  <Link 
                    to="/dashboard/sales"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs ${
                      isSalesRoute
                        ? 'bg-pink-50 text-pink-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-[14px] text-center font-bold text-sm leading-none">₱</span>
                    <span>Income</span>
                  </Link>
                  <Link 
                    to="/dashboard/inventoryReports"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs ${
                      isInventoryReportsRoute
                        ? 'bg-pink-50 text-pink-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Package size={14} />
                    <span>Inventory Reports</span>
                  </Link>
                  {/* ✅ Remittances link — ₱ glyph */}
                  <Link 
                    to="/dashboard/remittances"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs ${
                      isRemittancesRoute
                        ? 'bg-pink-50 text-pink-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-[14px] text-center font-bold text-sm leading-none">₱</span>
                    <span>Remittances</span>
                  </Link>
                </div>
              </div>
            </div>
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
                    {isInventoryReportsRoute && 'Inventory Reports'}
                    {isRemittancesRoute && 'Remittances'}
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
                    {isInventoryReportsRoute && 'View inventory usage and stock reports'}
                    {isRemittancesRoute && 'View remittance records and history'}
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