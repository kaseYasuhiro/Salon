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
  
  // Individual filter states for each table
  const [profitFilter, setProfitFilter] = useState('weekly');
  const [staffFilter, setStaffFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isLoadingProfit, setIsLoadingProfit] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  
  const [reports, setReports] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [frequentCustomers, setFrequentCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [servicePerformance, setServicePerformance] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [commissionsData, setCommissionsData] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const tableRef = useRef(null);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Helper function to format date without timezone conversion
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to get today's date string
  const getTodayString = () => {
    const today = new Date();
    return getLocalDateString(today);
  };

  // Get week range for display
  const getWeekRange = (startDate) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(getLocalDateString(start))} - ${formatDate(getLocalDateString(end))}`;
  };

  // Fetch reports for written-off data
  const fetchReports = async () => {
    try {
      const response = await api.get('/report');
      console.log('Fetched reports:', response.data);
      if (Array.isArray(response.data)) {
        setReports(response.data);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  // Get written-off amount for a specific date
  const getWrittenOffAmountForDate = (dateStr) => {
    const writtenOffReports = reports.filter(r => 
      r.status === 'written-off' && r.date === dateStr
    );
    return writtenOffReports.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  };

  // Get written-off amount for a date range (week or month)
  const getWrittenOffAmountForRange = (startDate, endDate) => {
    const writtenOffReports = reports.filter(r => {
      if (r.status !== 'written-off') return false;
      const reportDate = r.date;
      return reportDate >= startDate && reportDate <= endDate;
    });
    return writtenOffReports.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
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
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await api.get('/services');
      console.log('Fetched services:', response.data);
      if (Array.isArray(response.data)) {
        setServices(response.data);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  // Fetch expenses - Using the correct route
  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses');
      console.log('Fetched expenses:', response.data);
      if (Array.isArray(response.data)) {
        setExpenses(response.data);
        // Calculate total expenses
        const totalExpenses = response.data.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        setSalesData(prev => ({
          ...prev,
          totalExpenses
        }));
        // Set expenses data for table display
        setExpensesData(response.data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast('Failed to fetch expenses', 'error');
    }
  };

  // Fetch commissions
  const fetchCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      console.log('Fetched commissions:', response.data);
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

  // Get commission rate for a specific employee
  const getEmployeeCommissionRate = (employeeId) => {
    const commission = commissionsData.find(c => c.employee_id === employeeId);
    return commission ? parseFloat(commission.commission_amount) : 0;
  };

  // Calculate total commissions for a list of appointments
  const calculateCommissionsForAppointments = (appointments) => {
    let totalCommission = 0;
    
    appointments.forEach(app => {
      const employeeId = app.assigned_employee_id;
      if (employeeId) {
        const commissionRate = getEmployeeCommissionRate(employeeId);
        const serviceRevenue = parseFloat(app.price) || 0;
        const commissionAmount = serviceRevenue * commissionRate;
        totalCommission += commissionAmount;
      }
    });
    
    return totalCommission;
  };

  // Calculate staff performance with commissions
  const calculateStaffPerformance = (appointments, commissions) => {
    const staffMap = {};
    
    appointments.forEach(app => {
      const staffId = app.assigned_employee_id;
      if (staffId) {
        if (!staffMap[staffId]) {
          const staff = staffList.find(s => s.id === staffId);
          const commissionRate = getEmployeeCommissionRate(staffId);
          staffMap[staffId] = {
            staff_id: staffId,
            staff_name: staff?.name || `Staff ${staffId}`,
            totalRevenue: 0,
            appointmentCount: 0,
            totalCommission: 0,
            commissionRate: commissionRate,
            services: []
          };
        }
        const serviceRevenue = parseFloat(app.price) || 0;
        staffMap[staffId].totalRevenue += serviceRevenue;
        staffMap[staffId].appointmentCount += 1;
        const commissionAmount = serviceRevenue * staffMap[staffId].commissionRate;
        staffMap[staffId].totalCommission += commissionAmount;
        if (app.service_name) {
          staffMap[staffId].services.push(app.service_name);
        }
      }
    });
    
    return Object.values(staffMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  // Calculate service performance
  const calculateServicePerformance = (appointments) => {
    const serviceMap = {};
    
    appointments.forEach(app => {
      const serviceName = app.service_name || 'Unknown Service';
      if (!serviceMap[serviceName]) {
        serviceMap[serviceName] = {
          service_name: serviceName,
          totalRevenue: 0,
          count: 0
        };
      }
      serviceMap[serviceName].totalRevenue += parseFloat(app.price) || 0;
      serviceMap[serviceName].count += 1;
    });
    
    return Object.values(serviceMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  // Fetch sales data
  const fetchSalesData = async () => {
    setIsLoadingSales(true);
    try {
      const response = await api.get('/all-appointments');
      console.log('Fetched appointments for sales:', response.data);
      
      if (Array.isArray(response.data)) {
        const completedAppointments = response.data.filter(app => app.status === 'completed');
        
        // Apply date filter if set
        let filteredAppointments = completedAppointments;
        if (dateRange.startDate && dateRange.endDate) {
          filteredAppointments = completedAppointments.filter(app => {
            return app.appointment_date >= dateRange.startDate && 
                   app.appointment_date <= dateRange.endDate;
          });
        }
        
        // Apply staff filter
        if (selectedStaff !== 'all') {
          filteredAppointments = filteredAppointments.filter(
            app => app.assigned_employee_id === parseInt(selectedStaff)
          );
        }
        
        // Apply service filter
        if (selectedService !== 'all') {
          filteredAppointments = filteredAppointments.filter(
            app => app.service_id === parseInt(selectedService) || 
                   app.service_name === selectedService
          );
        }
        
        const totalRevenue = filteredAppointments.reduce((sum, app) => sum + (parseFloat(app.price) || 0), 0);
        const totalAppointments = filteredAppointments.length;
        const averageRevenue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
        
        // Calculate written off from reports
        const writtenOffReports = reports.filter(r => r.status === 'written-off');
        const totalWrittenOff = writtenOffReports.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        
        // Calculate total expenses
        const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        
        // Calculate total commissions using the employee commission rates
        const totalCommissions = calculateCommissionsForAppointments(filteredAppointments);
        
        // Calculate gross profit (revenue - written off)
        const grossProfit = totalRevenue - totalWrittenOff;
        
        // Calculate net profit (gross profit - expenses - commissions)
        const netProfit = grossProfit - totalExpenses - totalCommissions;
        
        // Calculate staff performance
        const staffPerf = calculateStaffPerformance(filteredAppointments, commissionsData);
        setStaffPerformance(staffPerf);
        
        // Calculate service performance
        const servicePerf = calculateServicePerformance(filteredAppointments);
        setServicePerformance(servicePerf);
        
        const todayStr = getTodayString();
        
        // Process daily data (last 30 days)
        const dailyMap = {};
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = getLocalDateString(date);
          dailyMap[dateStr] = { 
            date: dateStr, 
            revenue: 0, 
            count: 0,
            writtenOff: 0,
            expenses: 0,
            commissions: 0,
            grossProfit: 0,
            netProfit: 0,
            appointments: []
          };
        }
        
        filteredAppointments.forEach(app => {
          const dateStr = app.appointment_date;
          if (dateStr && dailyMap[dateStr]) {
            dailyMap[dateStr].revenue += parseFloat(app.price) || 0;
            dailyMap[dateStr].count += 1;
            dailyMap[dateStr].appointments.push(app);
          }
        });
        
        // Calculate daily profits with proper commissions and written-off
        Object.keys(dailyMap).forEach(key => {
          const dayAppointments = dailyMap[key].appointments || [];
          const dayRevenue = dailyMap[key].revenue;
          const dayWrittenOff = getWrittenOffAmountForDate(key);
          const dayExpenses = totalExpenses * (dayRevenue / totalRevenue || 0);
          const dayCommissions = calculateCommissionsForAppointments(dayAppointments);
          dailyMap[key].writtenOff = dayWrittenOff;
          dailyMap[key].expenses = dayExpenses;
          dailyMap[key].commissions = dayCommissions;
          dailyMap[key].grossProfit = dayRevenue - dayWrittenOff;
          dailyMap[key].netProfit = dayRevenue - dayWrittenOff - dayExpenses - dayCommissions;
        });
        
        const dailyData = Object.values(dailyMap);
        
        // Process weekly data (last 7 weeks)
        const weeklyMap = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - (i * 7));
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = getLocalDateString(weekStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekEndStr = getLocalDateString(weekEnd);
          
          weeklyMap[weekKey] = { 
            week: `Week ${7 - i}`,
            weekRange: getWeekRange(weekKey),
            revenue: 0, 
            count: 0,
            writtenOff: 0,
            expenses: 0,
            commissions: 0,
            grossProfit: 0,
            netProfit: 0,
            start: weekStart,
            appointments: []
          };
        }
        
        filteredAppointments.forEach(app => {
          const dateStr = app.appointment_date;
          if (dateStr) {
            const transDate = new Date(dateStr + 'T00:00:00');
            const weekStart = new Date(transDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = getLocalDateString(weekStart);
            if (weeklyMap[weekKey]) {
              weeklyMap[weekKey].revenue += parseFloat(app.price) || 0;
              weeklyMap[weekKey].count += 1;
              weeklyMap[weekKey].appointments.push(app);
            }
          }
        });
        
        Object.keys(weeklyMap).forEach(key => {
          const weekAppointments = weeklyMap[key].appointments || [];
          const weekRevenue = weeklyMap[key].revenue;
          const weekStart = new Date(key);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekEndStr = getLocalDateString(weekEnd);
          const weekWrittenOff = getWrittenOffAmountForRange(key, weekEndStr);
          const weekExpenses = totalExpenses * (weekRevenue / totalRevenue || 0);
          const weekCommissions = calculateCommissionsForAppointments(weekAppointments);
          weeklyMap[key].writtenOff = weekWrittenOff;
          weeklyMap[key].expenses = weekExpenses;
          weeklyMap[key].commissions = weekCommissions;
          weeklyMap[key].grossProfit = weekRevenue - weekWrittenOff;
          weeklyMap[key].netProfit = weekRevenue - weekWrittenOff - weekExpenses - weekCommissions;
        });
        
        const weeklyData = Object.values(weeklyMap);
        
        // Process monthly data (last 6 months)
        const monthlyMap = {};
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          const monthStartStr = getLocalDateString(monthStart);
          const monthEndStr = getLocalDateString(monthEnd);
          
          monthlyMap[monthKey] = { 
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: 0, 
            count: 0,
            writtenOff: 0,
            expenses: 0,
            commissions: 0,
            grossProfit: 0,
            netProfit: 0,
            appointments: []
          };
        }
        
        filteredAppointments.forEach(app => {
          const dateStr = app.appointment_date;
          if (dateStr) {
            const transDate = new Date(dateStr + 'T00:00:00');
            const monthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap[monthKey]) {
              monthlyMap[monthKey].revenue += parseFloat(app.price) || 0;
              monthlyMap[monthKey].count += 1;
              monthlyMap[monthKey].appointments.push(app);
            }
          }
        });
        
        Object.keys(monthlyMap).forEach(key => {
          const monthAppointments = monthlyMap[key].appointments || [];
          const monthRevenue = monthlyMap[key].revenue;
          const [year, month] = key.split('-').map(Number);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0);
          const monthStartStr = getLocalDateString(monthStart);
          const monthEndStr = getLocalDateString(monthEnd);
          const monthWrittenOff = getWrittenOffAmountForRange(monthStartStr, monthEndStr);
          const monthExpenses = totalExpenses * (monthRevenue / totalRevenue || 0);
          const monthCommissions = calculateCommissionsForAppointments(monthAppointments);
          monthlyMap[key].writtenOff = monthWrittenOff;
          monthlyMap[key].expenses = monthExpenses;
          monthlyMap[key].commissions = monthCommissions;
          monthlyMap[key].grossProfit = monthRevenue - monthWrittenOff;
          monthlyMap[key].netProfit = monthRevenue - monthWrittenOff - monthExpenses - monthCommissions;
        });
        
        const monthlyData = Object.values(monthlyMap);
        
        setSalesData(prev => ({
          ...prev,
          totalRevenue,
          totalAppointments,
          averageRevenue,
          dailyData,
          weeklyData,
          monthlyData,
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

  // Fetch profit data only
  const fetchProfitData = async () => {
    setIsLoadingProfit(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const completedAppointments = response.data.filter(app => app.status === 'completed');
        
        let filteredAppointments = completedAppointments;
        if (dateRange.startDate && dateRange.endDate) {
          filteredAppointments = completedAppointments.filter(app => {
            return app.appointment_date >= dateRange.startDate && 
                   app.appointment_date <= dateRange.endDate;
          });
        }
        
        const totalRevenue = filteredAppointments.reduce((sum, app) => sum + (parseFloat(app.price) || 0), 0);
        const totalAppointments = filteredAppointments.length;
        
        const writtenOffReports = reports.filter(r => r.status === 'written-off');
        const totalWrittenOff = writtenOffReports.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        const totalCommissions = calculateCommissionsForAppointments(filteredAppointments);
        const grossProfit = totalRevenue - totalWrittenOff;
        const netProfit = grossProfit - totalExpenses - totalCommissions;
        
        // Process data based on filter
        let profitData = [];
        const today = new Date();
        
        if (profitFilter === 'daily') {
          const dailyMap = {};
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = getLocalDateString(date);
            dailyMap[dateStr] = { 
              date: dateStr, 
              revenue: 0, 
              count: 0,
              writtenOff: 0,
              grossProfit: 0,
              expenses: 0,
              commissions: 0,
              netProfit: 0,
              appointments: []
            };
          }
          
          filteredAppointments.forEach(app => {
            const dateStr = app.appointment_date;
            if (dateStr && dailyMap[dateStr]) {
              dailyMap[dateStr].revenue += parseFloat(app.price) || 0;
              dailyMap[dateStr].count += 1;
              dailyMap[dateStr].appointments.push(app);
            }
          });
          
          Object.keys(dailyMap).forEach(key => {
            const dayAppointments = dailyMap[key].appointments || [];
            const dayRevenue = dailyMap[key].revenue;
            const dayWrittenOff = getWrittenOffAmountForDate(key);
            const dayExpenses = totalExpenses * (dayRevenue / totalRevenue || 0);
            const dayCommissions = calculateCommissionsForAppointments(dayAppointments);
            dailyMap[key].writtenOff = dayWrittenOff;
            dailyMap[key].grossProfit = dayRevenue - dayWrittenOff;
            dailyMap[key].expenses = dayExpenses;
            dailyMap[key].commissions = dayCommissions;
            dailyMap[key].netProfit = dayRevenue - dayWrittenOff - dayExpenses - dayCommissions;
          });
          
          profitData = Object.values(dailyMap);
        } else if (profitFilter === 'weekly') {
          const weeklyMap = {};
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - (i * 7));
            const weekStart = new Date(date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = getLocalDateString(weekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = getLocalDateString(weekEnd);
            
            weeklyMap[weekKey] = { 
              week: `Week ${7 - i}`,
              weekRange: getWeekRange(weekKey),
              revenue: 0, 
              count: 0,
              writtenOff: 0,
              grossProfit: 0,
              expenses: 0,
              commissions: 0,
              netProfit: 0,
              appointments: []
            };
          }
          
          filteredAppointments.forEach(app => {
            const dateStr = app.appointment_date;
            if (dateStr) {
              const transDate = new Date(dateStr + 'T00:00:00');
              const weekStart = new Date(transDate);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const weekKey = getLocalDateString(weekStart);
              if (weeklyMap[weekKey]) {
                weeklyMap[weekKey].revenue += parseFloat(app.price) || 0;
                weeklyMap[weekKey].count += 1;
                weeklyMap[weekKey].appointments.push(app);
              }
            }
          });
          
          Object.keys(weeklyMap).forEach(key => {
            const weekAppointments = weeklyMap[key].appointments || [];
            const weekRevenue = weeklyMap[key].revenue;
            const weekStart = new Date(key);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const weekEndStr = getLocalDateString(weekEnd);
            const weekWrittenOff = getWrittenOffAmountForRange(key, weekEndStr);
            const weekExpenses = totalExpenses * (weekRevenue / totalRevenue || 0);
            const weekCommissions = calculateCommissionsForAppointments(weekAppointments);
            weeklyMap[key].writtenOff = weekWrittenOff;
            weeklyMap[key].grossProfit = weekRevenue - weekWrittenOff;
            weeklyMap[key].expenses = weekExpenses;
            weeklyMap[key].commissions = weekCommissions;
            weeklyMap[key].netProfit = weekRevenue - weekWrittenOff - weekExpenses - weekCommissions;
          });
          
          profitData = Object.values(weeklyMap);
        } else {
          const monthlyMap = {};
          for (let i = 5; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[monthKey] = { 
              month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              revenue: 0, 
              count: 0,
              writtenOff: 0,
              grossProfit: 0,
              expenses: 0,
              commissions: 0,
              netProfit: 0,
              appointments: []
            };
          }
          
          filteredAppointments.forEach(app => {
            const dateStr = app.appointment_date;
            if (dateStr) {
              const transDate = new Date(dateStr + 'T00:00:00');
              const monthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
              if (monthlyMap[monthKey]) {
                monthlyMap[monthKey].revenue += parseFloat(app.price) || 0;
                monthlyMap[monthKey].count += 1;
                monthlyMap[monthKey].appointments.push(app);
              }
            }
          });
          
          Object.keys(monthlyMap).forEach(key => {
            const monthAppointments = monthlyMap[key].appointments || [];
            const monthRevenue = monthlyMap[key].revenue;
            const [year, month] = key.split('-').map(Number);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0);
            const monthStartStr = getLocalDateString(monthStart);
            const monthEndStr = getLocalDateString(monthEnd);
            const monthWrittenOff = getWrittenOffAmountForRange(monthStartStr, monthEndStr);
            const monthExpenses = totalExpenses * (monthRevenue / totalRevenue || 0);
            const monthCommissions = calculateCommissionsForAppointments(monthAppointments);
            monthlyMap[key].writtenOff = monthWrittenOff;
            monthlyMap[key].grossProfit = monthRevenue - monthWrittenOff;
            monthlyMap[key].expenses = monthExpenses;
            monthlyMap[key].commissions = monthCommissions;
            monthlyMap[key].netProfit = monthRevenue - monthWrittenOff - monthExpenses - monthCommissions;
          });
          
          profitData = Object.values(monthlyMap);
        }
        
        // Update only the profit data
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

  // Fetch staff data only
  const fetchStaffData = async () => {
    setIsLoadingStaff(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const completedAppointments = response.data.filter(app => app.status === 'completed');
        
        let filteredAppointments = completedAppointments;
        if (dateRange.startDate && dateRange.endDate) {
          filteredAppointments = completedAppointments.filter(app => {
            return app.appointment_date >= dateRange.startDate && 
                   app.appointment_date <= dateRange.endDate;
          });
        }
        
        if (staffFilter !== 'all') {
          filteredAppointments = filteredAppointments.filter(
            app => app.assigned_employee_id === parseInt(staffFilter)
          );
        }
        
        const staffPerf = calculateStaffPerformance(filteredAppointments, commissionsData);
        setStaffPerformance(staffPerf);
      }
    } catch (error) {
      console.error('Error fetching staff data:', error);
      showToast('Failed to fetch staff data', 'error');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Fetch service data only
  const fetchServiceData = async () => {
    setIsLoadingService(true);
    try {
      const response = await api.get('/all-appointments');
      if (Array.isArray(response.data)) {
        const completedAppointments = response.data.filter(app => app.status === 'completed');
        
        let filteredAppointments = completedAppointments;
        if (dateRange.startDate && dateRange.endDate) {
          filteredAppointments = completedAppointments.filter(app => {
            return app.appointment_date >= dateRange.startDate && 
                   app.appointment_date <= dateRange.endDate;
          });
        }
        
        if (serviceFilter !== 'all') {
          filteredAppointments = filteredAppointments.filter(
            app => app.service_id === parseInt(serviceFilter) || 
                   app.service_name === serviceFilter
          );
        }
        
        const servicePerf = calculateServicePerformance(filteredAppointments);
        setServicePerformance(servicePerf);
      }
    } catch (error) {
      console.error('Error fetching service data:', error);
      showToast('Failed to fetch service data', 'error');
    } finally {
      setIsLoadingService(false);
    }
  };

  // Fetch expenses data only
  const fetchExpensesData = async () => {
    setIsLoadingExpenses(true);
    try {
      const response = await api.get('/expenses');
      if (Array.isArray(response.data)) {
        // Display all expenses with expense_name, amount, expense_date
        setExpensesData(response.data);
        // Update total expenses
        const totalExpenses = response.data.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
        setSalesData(prev => ({
          ...prev,
          totalExpenses
        }));
      }
    } catch (error) {
      console.error('Error fetching expenses data:', error);
      showToast('Failed to fetch expenses data', 'error');
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  // Fetch most frequent customers
  const fetchFrequentCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const appointmentsResponse = await api.get('/all-appointments');
      const walkInsResponse = await api.get('/walk-in');
      
      const customerMap = {};
      
      if (Array.isArray(appointmentsResponse.data)) {
        appointmentsResponse.data.forEach(app => {
          const customerName = app.customer_name || 'Unknown Customer';
          const key = customerName;
          
          if (!customerMap[key]) {
            customerMap[key] = {
              name: customerName,
              email: app.customer_email || 'N/A',
              phone: app.customer_phone || 'N/A',
              totalVisits: 0,
              totalSpent: 0,
              lastVisit: app.appointment_date || null,
              type: 'Appointment'
            };
          }
          
          customerMap[key].totalVisits += 1;
          customerMap[key].totalSpent += parseFloat(app.price) || 0;
          
          if (app.appointment_date) {
            if (!customerMap[key].lastVisit || app.appointment_date > customerMap[key].lastVisit) {
              customerMap[key].lastVisit = app.appointment_date;
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
        .slice(0, 10);
      
      setFrequentCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching frequent customers:', error);
      showToast('Failed to fetch customer data', 'error');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get profit data based on filter
  const getProfitData = () => {
    if (profitFilter === 'weekly') {
      return salesData.weeklyData;
    } else if (profitFilter === 'monthly') {
      return salesData.monthlyData;
    } else {
      return salesData.dailyData.slice(-7);
    }
  };

  // Clear date filter
  const clearDateFilter = () => {
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
  };

  // Reset all filters
  const resetFilters = () => {
    setProfitFilter('weekly');
    setStaffFilter('all');
    setServiceFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setShowDateFilter(false);
    showToast('Filters reset', 'success');
    // Refresh all data
    fetchProfitData();
    fetchStaffData();
    fetchServiceData();
    fetchExpensesData();
  };

  // Print/Export as PDF
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
        body { font-family: Arial, sans-serif; padding: 20px; background: white; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        .section { margin-bottom: 30px; }
        .section h2 { background: #f3f4f6; padding: 10px; margin: 0; font-size: 16px; border: 1px solid #d1d5db; border-bottom: none; }
        table { width: 100%; border-collapse: collapse; }
        th { background-color: #f3f4f6; font-weight: bold; padding: 8px 10px; border: 1px solid #d1d5db; text-align: left; font-size: 12px; }
        td { padding: 6px 10px; border: 1px solid #d1d5db; font-size: 12px; }
        .total-row { background-color: #f9fafb; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        .currency { text-align: right; }
        .profit { color: #7c3aed; }
        .revenue { color: #2563eb; }
        .expense { color: #dc2626; }
        .commission { color: #f59e0b; }
        .written-off { color: #dc2626; }
        .summary-box { 
          display: flex; 
          justify-content: space-around; 
          margin: 20px 0; 
          padding: 15px; 
          background: #f9fafb; 
          border-radius: 8px;
          flex-wrap: wrap;
          gap: 10px;
          border: 1px solid #e5e7eb;
        }
        .summary-item { text-align: center; min-width: 100px; }
        .summary-item .label { font-size: 12px; color: #666; }
        .summary-item .value { font-size: 16px; font-weight: bold; }
        .page-break { page-break-after: always; }
      </style>
    `;
    
    // Get all table data
    const profitData = getProfitData();
    const staffData = staffPerformance;
    const serviceData = servicePerformance;
    const expenseData = expensesData;
    
    // Build Profit Table
    let profitRows = '';
    profitData.forEach(item => {
      const label = item.weekRange || item.month || item.date || item.week;
      profitRows += `
        <tr>
          <td>${label}</td>
          <td class="currency revenue">${formatCurrency(item.revenue)}</td>
          <td class="currency">${item.count}</td>
          <td class="currency written-off">${formatCurrency(item.writtenOff || 0)}</td>
          <td class="currency profit">${formatCurrency(item.grossProfit || 0)}</td>
          <td class="currency expense">${formatCurrency(item.expenses || 0)}</td>
          <td class="currency commission">${formatCurrency(item.commissions || 0)}</td>
          <td class="currency profit">${formatCurrency(item.netProfit || 0)}</td>
        </tr>
      `;
    });
    
    // Build Staff Table
    let staffRows = '';
    staffData.forEach(item => {
      staffRows += `
        <tr>
          <td>${item.staff_name}</td>
          <td class="currency revenue">${formatCurrency(item.totalRevenue)}</td>
          <td class="currency">${item.appointmentCount}</td>
          <td class="currency commission">${formatCurrency(item.totalCommission || 0)}</td>
          <td class="currency">${formatCurrency(item.appointmentCount > 0 ? item.totalRevenue / item.appointmentCount : 0)}</td>
        </tr>
      `;
    });
    
    // Build Service Table
    let serviceRows = '';
    serviceData.forEach(item => {
      serviceRows += `
        <tr>
          <td>${item.service_name}</td>
          <td class="currency revenue">${formatCurrency(item.totalRevenue)}</td>
          <td class="currency">${item.count}</td>
          <td class="currency">${formatCurrency(item.count > 0 ? item.totalRevenue / item.count : 0)}</td>
        </tr>
      `;
    });
    
    // Build Expenses Table - Only expense_name, amount, expense_date
    let expenseRows = '';
    expenseData.forEach(item => {
      expenseRows += `
        <tr>
          <td>${item.expense_name || 'N/A'}</td>
          <td class="currency expense">${formatCurrency(item.amount || 0)}</td>
          <td>${formatDate(item.expense_date)}</td>
        </tr>
      `;
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Report</title>
          ${styles}
        </head>
        <body>
          <div id="sales-report-content">
            <div class="header">
              <h1>Sales Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="summary-box">
              <div class="summary-item">
                <div class="label">Total Revenue</div>
                <div class="value revenue">${formatCurrency(salesData.totalRevenue)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Total Appointments</div>
                <div class="value">${formatNumber(salesData.totalAppointments)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Written Off</div>
                <div class="value written-off">${formatCurrency(salesData.totalWrittenOff)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Gross Profit</div>
                <div class="value profit">${formatCurrency(salesData.grossProfit)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Total Expenses</div>
                <div class="value expense">${formatCurrency(salesData.totalExpenses)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Commissions</div>
                <div class="value commission">${formatCurrency(salesData.totalCommissions)}</div>
              </div>
              <div class="summary-item">
                <div class="label">Net Profit</div>
                <div class="value profit">${formatCurrency(salesData.netProfit)}</div>
              </div>
            </div>
            
            <!-- Profit Report -->
            <div class="section">
              <h2>Profit Report (${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)})</h2>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Revenue</th>
                    <th>Appointments</th>
                    <th>Written Off</th>
                    <th>Gross Profit</th>
                    <th>Expenses</th>
                    <th>Commissions</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  ${profitRows || '<tr><td colspan="8" style="text-align:center;color:#999;">No data available</td></tr>'}
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="currency revenue">${formatCurrency(salesData.totalRevenue)}</td>
                    <td class="currency">${formatNumber(salesData.totalAppointments)}</td>
                    <td class="currency written-off">${formatCurrency(salesData.totalWrittenOff)}</td>
                    <td class="currency profit">${formatCurrency(salesData.grossProfit)}</td>
                    <td class="currency expense">${formatCurrency(salesData.totalExpenses)}</td>
                    <td class="currency commission">${formatCurrency(salesData.totalCommissions)}</td>
                    <td class="currency profit">${formatCurrency(salesData.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div class="page-break"></div>
            
            <!-- Staff Performance -->
            <div class="section">
              <h2>Staff Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Revenue</th>
                    <th>Appointments</th>
                    <th>Commission</th>
                    <th>Avg per Appointment</th>
                  </tr>
                </thead>
                <tbody>
                  ${staffRows || '<tr><td colspan="5" style="text-align:center;color:#999;">No staff data available</td></tr>'}
                </tbody>
              </table>
            </div>
            
            <!-- Service Performance -->
            <div class="section">
              <h2>Service Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Revenue</th>
                    <th>Bookings</th>
                    <th>Avg per Booking</th>
                  </tr>
                </thead>
                <tbody>
                  ${serviceRows || '<tr><td colspan="4" style="text-align:center;color:#999;">No service data available</td></tr>'}
                </tbody>
              </table>
            </div>
            
            <!-- Expenses Report -->
            <div class="section">
              <h2>Expenses Report</h2>
              <table>
                <thead>
                  <tr>
                    <th>Expense Name</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenseRows || '<tr><td colspan="3" style="text-align:center;color:#999;">No expenses data available</td></tr>'}
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="currency expense">${formatCurrency(salesData.totalExpenses)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div class="footer">
              <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    document.title = originalTitle;
  };

  // Download sales report as CSV with formatting
  const downloadSalesReport = () => {
    const profitData = getProfitData();
    const staffData = staffPerformance;
    const serviceData = servicePerformance;
    const expenseData = expensesData;
    
    if (profitData.length === 0 && staffData.length === 0 && serviceData.length === 0 && expenseData.length === 0) {
      showToast('No data to download', 'error');
      return;
    }
    
    // Create a more structured CSV with proper formatting
    let csv = '';
    
    // Header with report title
    csv += `"SALES REPORT"\n`;
    csv += `"Generated:",${new Date().toLocaleString()}\n`;
    csv += `"Period:",${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)}\n`;
    csv += `\n`;
    
    // ===== SUMMARY SECTION =====
    csv += `"=== SUMMARY ===\n"`;
    csv += `"Total Revenue","${formatCurrency(salesData.totalRevenue)}"\n`;
    csv += `"Total Appointments","${formatNumber(salesData.totalAppointments)}"\n`;
    csv += `"Total Written Off","${formatCurrency(salesData.totalWrittenOff)}"\n`;
    csv += `"Gross Profit","${formatCurrency(salesData.grossProfit)}"\n`;
    csv += `"Total Expenses","${formatCurrency(salesData.totalExpenses)}"\n`;
    csv += `"Commissions","${formatCurrency(salesData.totalCommissions)}"\n`;
    csv += `"Net Profit","${formatCurrency(salesData.netProfit)}"\n`;
    csv += `\n`;
    
    // ===== PROFIT REPORT =====
    csv += `"=== PROFIT REPORT (${profitFilter.charAt(0).toUpperCase() + profitFilter.slice(1)}) ===\n"`;
    csv += `"Period","Revenue","Appointments","Written Off","Gross Profit","Expenses","Commissions","Net Profit"\n`;
    profitData.forEach(item => {
      const label = item.weekRange || item.month || item.date || item.week;
      csv += `"${label}","${item.revenue}","${item.count}","${item.writtenOff || 0}","${item.grossProfit || 0}","${item.expenses || 0}","${item.commissions || 0}","${item.netProfit || 0}"\n`;
    });
    // Profit totals
    csv += `"TOTAL","${salesData.totalRevenue}","${formatNumber(salesData.totalAppointments)}","${salesData.totalWrittenOff}","${salesData.grossProfit}","${salesData.totalExpenses}","${salesData.totalCommissions}","${salesData.netProfit}"\n`;
    csv += `\n`;
    
    // ===== STAFF PERFORMANCE =====
    csv += `"=== STAFF PERFORMANCE ===\n"`;
    csv += `"Staff Member","Revenue","Appointments","Commission","Avg per Appointment"\n`;
    staffData.forEach(item => {
      const avgPerApp = item.appointmentCount > 0 ? (item.totalRevenue / item.appointmentCount) : 0;
      csv += `"${item.staff_name}","${item.totalRevenue}","${item.appointmentCount}","${item.totalCommission || 0}","${avgPerApp}"\n`;
    });
    csv += `\n`;
    
    // ===== SERVICE PERFORMANCE =====
    csv += `"=== SERVICE PERFORMANCE ===\n"`;
    csv += `"Service","Revenue","Bookings","Avg per Booking"\n`;
    serviceData.forEach(item => {
      const avgPerBooking = item.count > 0 ? (item.totalRevenue / item.count) : 0;
      csv += `"${item.service_name}","${item.totalRevenue}","${item.count}","${avgPerBooking}"\n`;
    });
    csv += `\n`;
    
    // ===== EXPENSES REPORT =====
    csv += `"=== EXPENSES REPORT ===\n"`;
    csv += `"Expense Name","Amount","Date"\n`;
    expenseData.forEach(item => {
      csv += `"${item.expense_name || 'N/A'}","${item.amount || 0}","${item.expense_date || 'N/A'}"\n`;
    });
    csv += `"TOTAL EXPENSES","${salesData.totalExpenses}",""\n`;
    
    // Footer
    csv += `\n`;
    csv += `"Report generated on:",${new Date().toLocaleString()}\n`;
    csv += `"All amounts are in Philippine Pesos (₱)"\n`;
    
    // Create blob with BOM for UTF-8 support
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

  // Fetch data on mount
  useEffect(() => {
    fetchReports();
    fetchFrequentCustomers();
    fetchStaffList();
    fetchServices();
    fetchExpenses();
    fetchCommissions();
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (reports.length > 0 || reports.length === 0) {
      fetchSalesData();
    }
  }, [reports]);

  // Refresh all data
  const handleRefresh = async () => {
    await Promise.all([
      fetchReports(),
      fetchSalesData(),
      fetchFrequentCustomers(),
      fetchExpenses(),
      fetchCommissions()
    ]);
    // Refresh individual table data
    fetchProfitData();
    fetchStaffData();
    fetchServiceData();
    fetchExpensesData();
    showToast('Data refreshed successfully!', 'success');
  };

  // Handle profit filter change
  const handleProfitFilterChange = (value) => {
    setProfitFilter(value);
    fetchProfitData();
  };

  // Handle staff filter change
  const handleStaffFilterChange = (value) => {
    setStaffFilter(value);
    fetchStaffData();
  };

  // Handle service filter change
  const handleServiceFilterChange = (value) => {
    setServiceFilter(value);
    fetchServiceData();
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
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
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
          <p className="text-sm text-gray-500 mt-1">Revenue and appointment statistics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            <span className="text-sm">Refresh</span>
          </button>
          <button
            onClick={resetFilters}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <X size={16} />
            <span className="text-sm">Reset Filters</span>
          </button>
          <button 
            onClick={downloadSalesReport}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Download CSV"
          >
            <Download size={18} />
            <span className="text-sm hidden sm:inline">CSV</span>
          </button>
          <button 
            onClick={exportAsPDF}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            title="Export as PDF"
          >
            <Printer size={18} />
            <span className="text-sm hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter - Moved to top */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Filter size={14} />
          <span>Date Range</span>
          {(dateRange.startDate || dateRange.endDate) && (
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </button>
        {(dateRange.startDate || dateRange.endDate) && (
          <span className="text-sm text-gray-500">
            {dateRange.startDate && `From: ${formatDate(dateRange.startDate)}`}
            {dateRange.startDate && dateRange.endDate && ' | '}
            {dateRange.endDate && `To: ${formatDate(dateRange.endDate)}`}
          </span>
        )}
      </div>

      {/* Date Range Inputs */}
      {showDateFilter && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">From:</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">To:</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={clearDateFilter}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {
              setShowDateFilter(false);
              // Refresh all tables with new date range
              fetchProfitData();
              fetchStaffData();
              fetchServiceData();
              fetchExpensesData();
            }}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      <div id="sales-report-content">
        {/* ===== PROFIT REPORT ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800">Profit Report</h3>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={profitFilter}
                  onChange={(e) => handleProfitFilterChange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <span className="text-xs text-gray-500">
                  {getProfitData().length} entries
                </span>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Written Off</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gross Profit</th>
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
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{label}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{formatCurrency(item.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.count}</td>
                        <td className="px-4 py-3 text-sm text-red-600 font-semibold">{formatCurrency(item.writtenOff || 0)}</td>
                        <td className="px-4 py-3 text-sm text-purple-600 font-semibold">{formatCurrency(item.grossProfit || 0)}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(item.expenses || 0)}</td>
                        <td className="px-4 py-3 text-sm text-yellow-600">{formatCurrency(item.commissions || 0)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-purple-600">{formatCurrency(item.netProfit || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-blue-600">{formatCurrency(salesData.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{formatNumber(salesData.totalAppointments)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(salesData.totalWrittenOff)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-purple-600">{formatCurrency(salesData.grossProfit)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(salesData.totalExpenses)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-yellow-600">{formatCurrency(salesData.totalCommissions)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-purple-600">{formatCurrency(salesData.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* ===== STAFF PERFORMANCE ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-green-500" />
                <h3 className="text-lg font-semibold text-gray-800">Staff Performance</h3>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={staffFilter}
                  onChange={(e) => handleStaffFilterChange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="all">All Staff</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">
                  {staffPerformance.length} staff members
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            {isLoadingStaff ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : staffPerformance.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No staff performance data available</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff Member</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Appointments</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Commission</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Avg per Appointment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staffPerformance.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          {item.staff_name.charAt(0).toUpperCase()}
                        </div>
                        {item.staff_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{formatCurrency(item.totalRevenue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.appointmentCount}</td>
                      <td className="px-4 py-3 text-sm text-yellow-600 font-semibold">{formatCurrency(item.totalCommission || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(item.appointmentCount > 0 ? item.totalRevenue / item.appointmentCount : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ===== SERVICE PERFORMANCE ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scissors size={20} className="text-pink-500" />
                <h3 className="text-lg font-semibold text-gray-800">Service Performance</h3>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={serviceFilter}
                  onChange={(e) => handleServiceFilterChange(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                >
                  <option value="all">All Services</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.service_name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500">
                  {servicePerformance.length} services
                </span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            {isLoadingService ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : servicePerformance.length === 0 ? (
              <div className="text-center py-12">
                <Scissors size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No service performance data available</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bookings</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Avg per Booking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {servicePerformance.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-pink-400 to-pink-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          <Scissors size={12} />
                        </div>
                        {item.service_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{formatCurrency(item.totalRevenue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(item.count > 0 ? item.totalRevenue / item.count : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ===== EXPENSES REPORT ===== */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt size={20} className="text-red-500" />
                <h3 className="text-lg font-semibold text-gray-800">Expenses Report</h3>
              </div>
              <span className="text-xs text-gray-500">
                {expensesData.length} entries
              </span>
            </div>
          </div>
          <div className="overflow-x-auto p-4">
            {isLoadingExpenses ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : expensesData.length === 0 ? (
              <div className="text-center py-12">
                <Receipt size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No expenses data available</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expense Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expensesData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {item.expense_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">
                        {formatCurrency(item.amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(item.expense_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600">{formatCurrency(salesData.totalExpenses)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Most Frequent Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-yellow-500" />
              Top Customers
            </h3>
            <span className="text-xs text-gray-500">Most frequent</span>
          </div>
        </div>
        <div className="p-4">
          {isLoadingCustomers ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : frequentCustomers.length === 0 ? (
            <div className="text-center py-12">
              <User size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No customer data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {frequentCustomers.map((customer, index) => (
                <div 
                  key={customer.name} 
                  className={`p-3 rounded-lg border ${index === 0 ? 'bg-yellow-50 border-yellow-200' : 
                    index === 1 ? 'bg-gray-50 border-gray-200' : 
                    index === 2 ? 'bg-amber-50 border-amber-200' : 
                    'bg-white border-gray-100'} transition-all hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {customer.name}
                        </p>
                        {index === 0 && <Award size={16} className="text-yellow-500" />}
                        {index === 1 && <Award size={16} className="text-gray-400" />}
                        {index === 2 && <Award size={16} className="text-amber-600" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{customer.totalVisits} visit{customer.totalVisits > 1 ? 's' : ''}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-green-600 font-medium">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Last visit: {formatDate(customer.lastVisit)}
                      </p>
                      <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${customer.type === 'Walk-in' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
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
    </div>
  );
}

export default Sales;