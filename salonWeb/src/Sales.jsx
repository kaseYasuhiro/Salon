import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BarChart3, DollarSign, Calendar, TrendingUp, 
  TrendingDown, Download, Printer, RefreshCw, 
  AlertTriangle, CheckCircle, Clock, FileText,
  LineChart, Activity, Users, User, Star, Award,
  Scissors, Percent, CreditCard, Filter, X,
  ChevronDown, Receipt, PieChart
} from 'lucide-react';
import api from '../api/axios';

function Sales() {
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalAppointments: 0,
    averageRevenue: 0,
    dailyData: [],
    weeklyData: [],
    monthlyData: [],
    totalWrittenOff: 0,
    grossProfit: 0,
    netProfit: 0,
    totalExpenses: 0,
    totalCommissions: 0
  });
  
  const [profitFilter, setProfitFilter] = useState('weekly');
  
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);
  
  const [reports, setReports] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [commissionsData, setCommissionsData] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const tableRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ============================================================
  // DATE HELPERS
  // ============================================================
  
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeDateStr = (dateStr) => {
    if (!dateStr && dateStr !== 0) return null;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}[T ]/.test(dateStr)) return dateStr.slice(0, 10);
    if (typeof dateStr === 'number') {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return getLocalDateString(d);
      return null;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return getLocalDateString(d);
    if (typeof dateStr === 'string' && dateStr.length >= 10) return dateStr.slice(0, 10);
    return null;
  };

  const getTodayString = () => getLocalDateString(new Date());

  const getWeekStartStr = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(start.getDate() - day);
    return getLocalDateString(start);
  };

  const getMonthKey = (dateStr) => dateStr.slice(0, 7);

  const getWeekRange = (startDate) => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(getLocalDateString(start))} - ${formatDate(getLocalDateString(end))}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount) =>
    `${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₱`;

  const formatNumber = (num) => num.toLocaleString();

  // ============================================================
  // FETCHERS
  // ============================================================

  const fetchReports = async () => {
    try {
      const response = await api.get('/report');
      if (Array.isArray(response.data)) setReports(response.data);
    } catch (error) { console.error('Error fetching reports:', error); }
  };

  const getWrittenOffAmountForDate = (dateStr) => {
    const rows = reports.filter(r => r.status === 'written-off' && normalizeDateStr(r.date) === dateStr);
    return rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const getWrittenOffAmountForRange = (startDate, endDate) => {
    const rows = reports.filter(r => {
      if (r.status !== 'written-off') return false;
      const reportDate = normalizeDateStr(r.date);
      return reportDate && reportDate >= startDate && reportDate <= endDate;
    });
    return rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  const fetchStaffList = async () => {
    try {
      const response = await api.get('/staff-list');
      if (Array.isArray(response.data)) setStaffList(response.data);
    } catch (error) { console.error('Error fetching staff list:', error); }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      if (Array.isArray(response.data)) setServices(response.data);
    } catch (error) { console.error('Error fetching services:', error); }
  };

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      if (Array.isArray(response.data)) {
        setExpenses(response.data);
        const total = response.data.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        setSalesData(prev => ({ ...prev, totalExpenses: total }));
      }
    } catch (error) { console.error('Error fetching expenses:', error); }
  };

  const fetchCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      setCommissionsData(Array.isArray(response.data) ? response.data : []);
    } catch (error) { setCommissionsData([]); }
  };

  // ============================================================
  // COMMISSION HELPERS
  // ============================================================

  const getEmployeeCommissionRate = (employeeId) => {
    const c = commissionsData.find(c => c.employee_id === employeeId);
    return c ? parseFloat(c.commission_amount) : 0;
  };

  const calculateCommissionsForAppointments = (appointments) => {
    let total = 0;
    appointments.forEach(app => {
      const empId = app.assigned_employee_id;
      if (empId) {
        const rate = getEmployeeCommissionRate(empId);
        total += (parseFloat(app.price) || 0) * rate;
      }
    });
    return total;
  };

  // staffValue is "all" or a numeric string. Matches on assigned_employee_id (users.id).
  const applyStaffFilter = (appointments, staffValue) => {
    if (!staffValue || staffValue === 'all') return appointments;
    const target = parseInt(staffValue, 10);
    if (isNaN(target)) return appointments;
    return appointments.filter(app => {
      const id = app.assigned_employee_id;
      return id != null && parseInt(id, 10) === target;
    });
  };

  // ============================================================
  // BUCKET BUILDERS
  // ============================================================

  const buildDailyBuckets = (appointments, daysBack = 30, isAllStaff = true) => {
    const map = {};
    const today = new Date();

    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      map[key] = {
        key, date: key, label: key,
        revenue: 0, count: 0, writtenOff: 0, expenses: 0,
        commissions: 0, grossProfit: 0, netProfit: 0, appointments: []
      };
    }

    appointments.forEach(app => {
      const dateStr = normalizeDateStr(app.appointment_date);
      if (!dateStr) return;
      if (!map[dateStr]) {
        map[dateStr] = {
          key: dateStr, date: dateStr, label: dateStr,
          revenue: 0, count: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0, appointments: []
        };
      }
      map[dateStr].revenue += parseFloat(app.price) || 0;
      map[dateStr].count += 1;
      map[dateStr].appointments.push(app);
    });

    const globalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + (parseFloat(a.price) || 0), 0);

    Object.keys(map).forEach(key => {
      const b = map[key];
      const w = getWrittenOffAmountForDate(key);
      const c = calculateCommissionsForAppointments(b.appointments);
      const e = totalRevenue > 0 ? globalExpenses * (b.revenue / totalRevenue) : 0;
      b.writtenOff = w;
      b.commissions = c;
      b.expenses = isAllStaff ? e : 0;
      b.grossProfit = b.revenue - w;
      b.netProfit = isAllStaff ? b.revenue - w - e - c : b.revenue - w - c;
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  };

  const buildWeeklyBuckets = (appointments, weeksBack = 7, isAllStaff = true) => {
    const map = {};
    const today = new Date();

    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 7));
      const ws = new Date(d);
      ws.setDate(ws.getDate() - ws.getDay());
      const key = getLocalDateString(ws);
      map[key] = {
        key,
        week: `Week ${weeksBack - i}`,
        weekRange: getWeekRange(key),
        label: getWeekRange(key),
        revenue: 0, count: 0, writtenOff: 0, expenses: 0,
        commissions: 0, grossProfit: 0, netProfit: 0, appointments: []
      };
    }

    appointments.forEach(app => {
      const dateStr = normalizeDateStr(app.appointment_date);
      if (!dateStr) return;
      const ws = getWeekStartStr(dateStr);
      if (!map[ws]) {
        map[ws] = {
          key: ws, week: ws,
          weekRange: getWeekRange(ws), label: getWeekRange(ws),
          revenue: 0, count: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0, appointments: []
        };
      }
      map[ws].revenue += parseFloat(app.price) || 0;
      map[ws].count += 1;
      map[ws].appointments.push(app);
    });

    const globalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + (parseFloat(a.price) || 0), 0);

    Object.keys(map).forEach(key => {
      const b = map[key];
      const we = getLocalDateString(new Date(new Date(key + 'T00:00:00').getTime() + 6 * 86400000));
      const w = getWrittenOffAmountForRange(key, we);
      const c = calculateCommissionsForAppointments(b.appointments);
      const e = totalRevenue > 0 ? globalExpenses * (b.revenue / totalRevenue) : 0;
      b.writtenOff = w;
      b.commissions = c;
      b.expenses = isAllStaff ? e : 0;
      b.grossProfit = b.revenue - w;
      b.netProfit = isAllStaff ? b.revenue - w - e - c : b.revenue - w - c;
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  };

  const buildMonthlyBuckets = (appointments, monthsBack = 6, isAllStaff = true) => {
    const map = {};
    const today = new Date();

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = {
        key,
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: 0, count: 0, writtenOff: 0, expenses: 0,
        commissions: 0, grossProfit: 0, netProfit: 0, appointments: []
      };
    }

    appointments.forEach(app => {
      const dateStr = normalizeDateStr(app.appointment_date);
      if (!dateStr) return;
      const mk = getMonthKey(dateStr);
      if (!map[mk]) {
        const [y, m] = mk.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        map[mk] = {
          key: mk,
          month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: 0, count: 0, writtenOff: 0, expenses: 0,
          commissions: 0, grossProfit: 0, netProfit: 0, appointments: []
        };
      }
      map[mk].revenue += parseFloat(app.price) || 0;
      map[mk].count += 1;
      map[mk].appointments.push(app);
    });

    const globalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalRevenue = appointments.reduce((s, a) => s + (parseFloat(a.price) || 0), 0);

    Object.keys(map).forEach(key => {
      const b = map[key];
      const [year, month] = key.split('-').map(Number);
      const ms = `${key}-01`;
      const me = getLocalDateString(new Date(year, month, 0));
      const w = getWrittenOffAmountForRange(ms, me);
      const c = calculateCommissionsForAppointments(b.appointments);
      const e = totalRevenue > 0 ? globalExpenses * (b.revenue / totalRevenue) : 0;
      b.writtenOff = w;
      b.commissions = c;
      b.expenses = isAllStaff ? e : 0;
      b.grossProfit = b.revenue - w;
      b.netProfit = isAllStaff ? b.revenue - w - e - c : b.revenue - w - c;
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  };

  // ============================================================
  // FETCH SALES DATA
  // ============================================================

  const fetchSalesData = async (staffOverride) => {
    const activeStaff = staffOverride !== undefined ? staffOverride : selectedStaff;
    const isAllStaff = activeStaff === 'all';

    setIsLoadingSales(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const completed = response.data.filter(app => app.status === 'completed');

        let filtered = completed;
        if (dateRange.startDate && dateRange.endDate) {
          filtered = completed.filter(app => {
            const d = normalizeDateStr(app.appointment_date);
            return d && d >= dateRange.startDate && d <= dateRange.endDate;
          });
        }

        filtered = applyStaffFilter(filtered, activeStaff);

        if (selectedService !== 'all') {
          filtered = filtered.filter(
            app => app.service_id === parseInt(selectedService) || app.service_name === selectedService
          );
        }

        const totalRevenue = filtered.reduce((s, a) => s + (parseFloat(a.price) || 0), 0);
        const totalAppointments = filtered.length;
        const averageRevenue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

        const totalWrittenOff = reports
          .filter(r => r.status === 'written-off')
          .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        const globalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const totalExpenses = isAllStaff ? globalExpenses : 0;

        const totalCommissions = calculateCommissionsForAppointments(filtered);
        const grossProfit = totalRevenue - totalWrittenOff;
        const netProfit = isAllStaff
          ? grossProfit - globalExpenses - totalCommissions
          : grossProfit - totalCommissions;

        setSalesData(prev => ({
          ...prev,
          totalRevenue,
          totalAppointments,
          averageRevenue,
          dailyData: buildDailyBuckets(filtered, 30, isAllStaff),
          weeklyData: buildWeeklyBuckets(filtered, 7, isAllStaff),
          monthlyData: buildMonthlyBuckets(filtered, 6, isAllStaff),
          totalWrittenOff,
          grossProfit,
          netProfit,
          totalExpenses,
          totalCommissions
        }));
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showToast('Failed to fetch sales data', 'error');
    } finally {
      setIsLoadingSales(false);
    }
  };

  // ============================================================
  // FETCH PROFIT DATA
  // ============================================================

  const fetchProfitData = async (staffOverride) => {
    const activeStaff = staffOverride !== undefined ? staffOverride : selectedStaff;
    const isAllStaff = activeStaff === 'all';

    setIsLoadingProfit(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const completed = response.data.filter(app => app.status === 'completed');

        let filtered = completed;
        if (dateRange.startDate && dateRange.endDate) {
          filtered = completed.filter(app => {
            const d = normalizeDateStr(app.appointment_date);
            return d && d >= dateRange.startDate && d <= dateRange.endDate;
          });
        }

        filtered = applyStaffFilter(filtered, activeStaff);

        const totalRevenue = filtered.reduce((s, a) => s + (parseFloat(a.price) || 0), 0);
        const totalAppointments = filtered.length;

        const totalWrittenOff = reports
          .filter(r => r.status === 'written-off')
          .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

        const globalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const totalExpenses = isAllStaff ? globalExpenses : 0;
        const totalCommissions = calculateCommissionsForAppointments(filtered);
        const grossProfit = totalRevenue - totalWrittenOff;
        const netProfit = isAllStaff
          ? grossProfit - globalExpenses - totalCommissions
          : grossProfit - totalCommissions;

        let profitData = [];
        if (profitFilter === 'daily') {
          profitData = buildDailyBuckets(filtered, 7, isAllStaff);
        } else if (profitFilter === 'weekly') {
          profitData = buildWeeklyBuckets(filtered, 7, isAllStaff);
        } else {
          profitData = buildMonthlyBuckets(filtered, 6, isAllStaff);
        }

        setSalesData(prev => ({
          ...prev,
          totalRevenue,
          totalAppointments,
          totalWrittenOff,
          grossProfit,
          netProfit,
          totalExpenses,
          totalCommissions,
          dailyData: profitFilter === 'daily' ? profitData : prev.dailyData,
          weeklyData: profitFilter === 'weekly' ? profitData : prev.weeklyData,
          monthlyData: profitFilter === 'monthly' ? profitData : prev.monthlyData
        }));
      }
    } catch (error) {
      console.error('Error fetching profit data:', error);
      showToast('Failed to fetch profit data', 'error');
    } finally {
      setIsLoadingProfit(false);
    }
  };

  // ============================================================
  // UI HELPERS
  // ============================================================

  const getProfitData = () => {
    if (profitFilter === 'weekly') return salesData.weeklyData;
    if (profitFilter === 'monthly') return salesData.monthlyData;
    return salesData.dailyData.slice(-7);
  };

  const getSelectedStaffName = () => {
    if (selectedStaff === 'all') return 'All Staff';
    const staff = staffList.find(s => s.id === parseInt(selectedStaff));
    return staff?.name || `Staff #${selectedStaff}`;
  };

  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
  };

  const resetFilters = () => {
    setProfitFilter('weekly');
    setSelectedStaff('all');
    setSelectedService('all');
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
    showToast('Filters reset', 'success');
    fetchProfitData('all');
  };

  const handleStaffFilterChange = (value) => {
    setSelectedStaff(value);
    fetchProfitData(value);     // ✅ pass the value directly — no stale state
  };

  const handleProfitFilterChange = (value) => {
    setProfitFilter(value);
    // Use a microtask so the state change is flushed; read fresh selectedStaff inside
    setTimeout(() => fetchProfitData(), 0);
  };

  // ============================================================
  // EXPORTS
  // ============================================================

  const exportAsPDF = () => {
    const printContent = document.getElementById('sales-report-content');
    if (!printContent) return;

    const originalTitle = document.title;
    document.title = 'Sales Report';

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      showToast('Please allow popups to print', 'error');
      return;
    }

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: white; color: #000; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; color: #000; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { background: #f3f4f6; padding: 10px; margin: 0; font-size: 16px; border: 1px solid #d1d5db; border-bottom: none; color: #000; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f3f4f6; font-weight: bold; padding: 8px 10px; border: 1px solid #d1d5db; text-align: left; font-size: 12px; color: #000; }
        td { padding: 6px 10px; border: 1px solid #d1d5db; font-size: 12px; color: #000; }
        .total-row { background-color: #f9fafb; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        .currency { text-align: right; color: #000; }
        .summary-box { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; flex-wrap: wrap; gap: 10px; border: 1px solid #e5e7eb; }
        .summary-item { text-align: center; min-width: 100px; }
        .summary-item .label { font-size: 12px; color: #666; }
        .summary-item .value { font-size: 16px; font-weight: bold; color: #000; }
      </style>
    `;

    const profitData = getProfitData();

    let profitRows = '';
    profitData.forEach(item => {
      const label = item.weekRange || item.month || item.date || item.week;
      profitRows += `
        <tr>
          <td>${label}</td>
          <td class="currency">${formatCurrency(item.revenue)}</td>
          <td class="currency">${item.count}</td>
          <td class="currency">${formatCurrency(item.writtenOff || 0)}</td>
          <td class="currency">${formatCurrency(item.expenses || 0)}</td>
          <td class="currency">${formatCurrency(item.commissions || 0)}</td>
          <td class="currency">${formatCurrency(item.netProfit || 0)}</td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Sales Report</title>${styles}</head>
        <body>
          <div id="sales-report-content">
            <div class="header">
              <h1>Sales Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p>Staff: ${getSelectedStaffName()}</p>
            </div>
            <div class="summary-box">
              <div class="summary-item"><div class="label">Total Revenue</div><div class="value">${formatCurrency(salesData.totalRevenue)}</div></div>
              <div class="summary-item"><div class="label">Total Appointments</div><div class="value">${formatNumber(salesData.totalAppointments)}</div></div>
              <div class="summary-item"><div class="label">Incidents</div><div class="value">${formatCurrency(salesData.totalWrittenOff)}</div></div>
              <div class="summary-item"><div class="label">Total Expenses</div><div class="value">${formatCurrency(salesData.totalExpenses)}</div></div>
              <div class="summary-item"><div class="label">Commissions</div><div class="value">${formatCurrency(salesData.totalCommissions)}</div></div>
              <div class="summary-item"><div class="label">Net Profit</div><div class="value">${formatCurrency(salesData.netProfit)}</div></div>
            </div>
            <div class="section">
              <h2>Profit Report (${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)})</h2>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Revenue</th>
                    <th>Appointments</th>
                    <th>Incidents</th>
                    <th>Expenses</th>
                    <th>Commissions</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  ${profitRows || '<tr><td colspan="7" style="text-align:center;color:#999;">No data available</td></tr>'}
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="currency">${formatCurrency(salesData.totalRevenue)}</td>
                    <td class="currency">${formatNumber(salesData.totalAppointments)}</td>
                    <td class="currency">${formatCurrency(salesData.totalWrittenOff)}</td>
                    <td class="currency">${formatCurrency(salesData.totalExpenses)}</td>
                    <td class="currency">${formatCurrency(salesData.totalCommissions)}</td>
                    <td class="currency">${formatCurrency(salesData.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="footer">
              <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    document.title = originalTitle;
  };

  const downloadSalesReport = () => {
    const profitData = getProfitData();
    if (profitData.length === 0) {
      showToast('No data to download', 'error');
      return;
    }

    let csv = '';
    csv += `"SALES REPORT"\n`;
    csv += `"Generated:",${new Date().toLocaleString()}\n`;
    csv += `"Period:",${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)}\n`;
    csv += `"Staff:",${getSelectedStaffName()}\n`;
    csv += `\n`;
    csv += `"=== SUMMARY ===\n"`;
    csv += `"Total Revenue","${formatCurrency(salesData.totalRevenue)}"\n`;
    csv += `"Total Appointments","${formatNumber(salesData.totalAppointments)}"\n`;
    csv += `"Total Incidents","${formatCurrency(salesData.totalWrittenOff)}"\n`;
    csv += `"Total Expenses","${formatCurrency(salesData.totalExpenses)}"\n`;
    csv += `"Commissions","${formatCurrency(salesData.totalCommissions)}"\n`;
    csv += `"Net Profit","${formatCurrency(salesData.netProfit)}"\n`;
    csv += `\n`;
    csv += `"=== PROFIT REPORT (${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)}) ===\n"`;
    csv += `"Period","Revenue","Appointments","Incidents","Expenses","Commissions","Net Profit"\n`;
    profitData.forEach(item => {
      const label = item.weekRange || item.month || item.date || item.week;
      csv += `"${label}","${item.revenue}","${item.count}","${item.writtenOff || 0}","${item.expenses || 0}","${item.commissions || 0}","${item.netProfit || 0}"\n`;
    });
    csv += `"TOTAL","${salesData.totalRevenue}","${formatNumber(salesData.totalAppointments)}","${salesData.totalWrittenOff}","${salesData.totalExpenses}","${salesData.totalCommissions}","${salesData.netProfit}"\n`;
    csv += `\n\n`;
    csv += `"Report generated on:",${new Date().toLocaleString()}\n`;
    csv += `"All amounts are in Philippine Pesos (₱)"\n`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${getTodayString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ============================================================
  // LIFECYCLE
  // ============================================================

  useEffect(() => {
    fetchReports();
    fetchStaffList();
    fetchServices();
    fetchExpenses();
    fetchCommissions();
  }, []);

  useEffect(() => {
    if (reports.length > 0 || reports.length === 0) {
      fetchSalesData();
    }
  }, [reports]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchReports(),
      fetchSalesData(),
      fetchExpenses(),
      fetchCommissions()
    ]);
    fetchProfitData();
    showToast('Data refreshed successfully!', 'success');
  };

  if (isLoadingSales && salesData.totalAppointments === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-500" />
            Sales Report
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Revenue and appointment statistics {selectedStaff !== 'all' && `— ${getSelectedStaffName()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleRefresh} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <RefreshCw size={16} />
            <span className="text-sm">Refresh</span>
          </button>
          <button onClick={resetFilters} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <X size={16} />
            <span className="text-sm">Reset Filters</span>
          </button>
          <button onClick={downloadSalesReport} className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2" title="Download CSV">
            <Download size={18} />
            <span className="text-sm hidden sm:inline">CSV</span>
          </button>
          <button onClick={exportAsPDF} className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2" title="Export as PDF">
            <Printer size={18} />
            <span className="text-sm hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
        <button onClick={() => setShowDateFilter(!showDateFilter)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
          <Filter size={14} />
          <span>Date Range</span>
          {(dateRange.startDate || dateRange.endDate) && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
        </button>
        {(dateRange.startDate || dateRange.endDate) && (
          <span className="text-sm text-gray-500">
            {dateRange.startDate && `From: ${formatDate(dateRange.startDate)}`}
            {dateRange.startDate && dateRange.endDate && ' | '}
            {dateRange.endDate && `To: ${formatDate(dateRange.endDate)}`}
          </span>
        )}
      </div>

      {showDateFilter && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From:</span>
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">To:</span>
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={clearDateFilter} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">Clear</button>
          <button onClick={() => { setShowDateFilter(false); fetchProfitData(); }} className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Apply</button>
        </div>
      )}

      <div id="sales-report-content">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">Profit Report</h3>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <select value={selectedStaff} onChange={(e) => handleStaffFilterChange(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="all">All Staff</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <select value={profitFilter} onChange={(e) => handleProfitFilterChange(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <span className="text-xs text-gray-500">{getProfitData().length} entries</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            {isLoadingProfit ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : getProfitData().length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No sales data available</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Appointments</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Incidents</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expenses</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Commissions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getProfitData().map((item, index) => {
                    const label = item.weekRange || item.month || item.date || item.week;
                    return (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-black">{label}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-black">{item.count}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-black">{formatCurrency(item.writtenOff || 0)}</td>
                        <td className="px-4 py-3 text-sm text-black">{formatCurrency(item.expenses || 0)}</td>
                        <td className="px-4 py-3 text-sm text-black">{formatCurrency(item.commissions || 0)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-black">{formatCurrency(item.netProfit || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-black">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{formatCurrency(salesData.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{formatNumber(salesData.totalAppointments)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{formatCurrency(salesData.totalWrittenOff)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{formatCurrency(salesData.totalExpenses)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{formatCurrency(salesData.totalCommissions)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-black">{formatCurrency(salesData.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sales;