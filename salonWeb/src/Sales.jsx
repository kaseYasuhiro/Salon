import { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, DollarSign, Calendar, TrendingUp, 
  TrendingDown, Download, Printer, RefreshCw, 
  AlertTriangle, CheckCircle, Clock, FileText,
  LineChart, Activity, Users, User, Star, Award
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
    netProfit: 0
  });
  const [salesFilter, setSalesFilter] = useState('weekly');
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [reports, setReports] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [frequentCustomers, setFrequentCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
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

  // Helper function to get today's date string without timezone conversion
  const getTodayString = () => {
    const today = new Date();
    return getLocalDateString(today);
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

  // Fetch sales data
  const fetchSalesData = async () => {
    setIsLoadingSales(true);
    try {
      const response = await api.get('/all-appointments');
      console.log('Fetched appointments for sales:', response.data);
      
      if (Array.isArray(response.data)) {
        const completedAppointments = response.data.filter(app => app.status === 'completed');
        
        const totalRevenue = completedAppointments.reduce((sum, app) => sum + (parseFloat(app.price) || 0), 0);
        const totalAppointments = completedAppointments.length;
        const averageRevenue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
        
        const writtenOffReports = reports.filter(r => r.status === 'written-off');
        const totalWrittenOff = writtenOffReports.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const netProfit = totalRevenue - totalWrittenOff;
        
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
            netProfit: 0
          };
        }
        
        completedAppointments.forEach(app => {
          const dateStr = app.appointment_date;
          if (dateStr && dailyMap[dateStr]) {
            dailyMap[dateStr].revenue += parseFloat(app.price) || 0;
            dailyMap[dateStr].count += 1;
          }
        });
        
        writtenOffReports.forEach(report => {
          const dateStr = report.date;
          if (dateStr && dailyMap[dateStr]) {
            dailyMap[dateStr].writtenOff += parseFloat(report.amount) || 0;
          }
        });
        
        Object.keys(dailyMap).forEach(key => {
          dailyMap[key].netProfit = dailyMap[key].revenue - dailyMap[key].writtenOff;
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
          weeklyMap[weekKey] = { 
            week: `Week ${7 - i}`, 
            revenue: 0, 
            count: 0,
            writtenOff: 0,
            netProfit: 0,
            start: weekStart
          };
        }
        
        completedAppointments.forEach(app => {
          const dateStr = app.appointment_date;
          if (dateStr) {
            const transDate = new Date(dateStr + 'T00:00:00');
            const weekStart = new Date(transDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = getLocalDateString(weekStart);
            if (weeklyMap[weekKey]) {
              weeklyMap[weekKey].revenue += parseFloat(app.price) || 0;
              weeklyMap[weekKey].count += 1;
            }
          }
        });
        
        writtenOffReports.forEach(report => {
          const dateStr = report.date;
          if (dateStr) {
            const transDate = new Date(dateStr + 'T00:00:00');
            const weekStart = new Date(transDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = getLocalDateString(weekStart);
            if (weeklyMap[weekKey]) {
              weeklyMap[weekKey].writtenOff += parseFloat(report.amount) || 0;
            }
          }
        });
        
        Object.keys(weeklyMap).forEach(key => {
          weeklyMap[key].netProfit = weeklyMap[key].revenue - weeklyMap[key].writtenOff;
        });
        
        const weeklyData = Object.values(weeklyMap);
        
        // Process monthly data (last 6 months)
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
            netProfit: 0
          };
        }
        
        completedAppointments.forEach(app => {
          const dateStr = app.appointment_date;
          if (dateStr) {
            const transDate = new Date(dateStr + 'T00:00:00');
            const monthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap[monthKey]) {
              monthlyMap[monthKey].revenue += parseFloat(app.price) || 0;
              monthlyMap[monthKey].count += 1;
            }
          }
        });
        
        writtenOffReports.forEach(report => {
          const dateStr = report.date;
          if (dateStr) {
            const transDate = new Date(dateStr + 'T00:00:00');
            const monthKey = `${transDate.getFullYear()}-${String(transDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap[monthKey]) {
              monthlyMap[monthKey].writtenOff += parseFloat(report.amount) || 0;
            }
          }
        });
        
        Object.keys(monthlyMap).forEach(key => {
          monthlyMap[key].netProfit = monthlyMap[key].revenue - monthlyMap[key].writtenOff;
        });
        
        const monthlyData = Object.values(monthlyMap);
        
        setSalesData({
          totalRevenue,
          totalAppointments,
          averageRevenue,
          dailyData,
          weeklyData,
          monthlyData,
          totalWrittenOff,
          netProfit
        });
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      showToast('Failed to fetch sales data', 'error');
    } finally {
      setIsLoadingSales(false);
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
    return `₱${parseFloat(amount).toLocaleString()}`;
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

  // Get chart data based on filter
  const getChartData = () => {
    if (salesFilter === 'weekly') {
      return salesData.weeklyData;
    } else if (salesFilter === 'monthly') {
      return salesData.monthlyData;
    } else {
      return salesData.dailyData.slice(-7); // Last 7 days
    }
  };

  // Get max revenue for chart scaling
  const getMaxRevenue = () => {
    const data = getChartData();
    if (data.length === 0) return 100;
    const max = Math.max(...data.map(d => d.netProfit || d.revenue));
    return max > 0 ? max : 100;
  };

  // Get rank icon based on position
  const getRankIcon = (index) => {
    if (index === 0) return <Award size={16} className="text-yellow-500" />;
    if (index === 1) return <Award size={16} className="text-gray-400" />;
    if (index === 2) return <Award size={16} className="text-amber-600" />;
    return <span className="text-xs font-semibold text-gray-400 w-4 text-center">#{index + 1}</span>;
  };

  // Get rank color based on position
  const getRankColor = (index) => {
    if (index === 0) return 'bg-yellow-50 border-yellow-200';
    if (index === 1) return 'bg-gray-50 border-gray-200';
    if (index === 2) return 'bg-amber-50 border-amber-200';
    return 'bg-white border-gray-100';
  };

  // Print/Export as PDF
  const exportAsPDF = () => {
    const printContent = document.getElementById('sales-table-content');
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
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #666; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #f3f4f6; font-weight: bold; padding: 10px; border: 1px solid #d1d5db; text-align: left; }
        td { padding: 8px 10px; border: 1px solid #d1d5db; }
        .total-row { background-color: #f9fafb; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        .currency { text-align: right; }
        .profit { color: #7c3aed; }
        .revenue { color: #2563eb; }
        .written-off { color: #dc2626; }
        .summary-box { 
          display: flex; 
          justify-content: space-around; 
          margin: 20px 0; 
          padding: 15px; 
          background: #f9fafb; 
          border-radius: 8px;
        }
        .summary-item { text-align: center; }
        .summary-item .label { font-size: 12px; color: #666; }
        .summary-item .value { font-size: 18px; font-weight: bold; }
      </style>
    `;
    
    const data = getChartData();
    const periodLabel = salesFilter === 'daily' ? 'Daily' : salesFilter === 'weekly' ? 'Weekly' : 'Monthly';
    
    let tableRows = '';
    data.forEach(item => {
      const label = item.month || item.week || item.date;
      tableRows += `
        <tr>
          <td>${label}</td>
          <td class="currency revenue">${formatCurrency(item.revenue)}</td>
          <td class="currency">${item.count}</td>
          <td class="currency written-off">${formatCurrency(item.writtenOff || 0)}</td>
          <td class="currency profit">${formatCurrency(item.netProfit || 0)}</td>
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
          <div class="header">
            <h1>Sales Report</h1>
            <p>Period: ${periodLabel} View</p>
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
              <div class="label">Net Profit</div>
              <div class="value profit">${formatCurrency(salesData.netProfit)}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Appointments</th>
                <th>Written Off</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total</td>
                <td class="currency revenue">${formatCurrency(salesData.totalRevenue)}</td>
                <td class="currency">${formatNumber(salesData.totalAppointments)}</td>
                <td class="currency written-off">${formatCurrency(salesData.totalWrittenOff)}</td>
                <td class="currency profit">${formatCurrency(salesData.netProfit)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div class="footer">
            <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
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
    
    // Restore title
    document.title = originalTitle;
  };

  // Download sales report as CSV
  const downloadSalesReport = () => {
    const data = getChartData();
    if (data.length === 0) {
      showToast('No data to download', 'error');
      return;
    }
    
    let csv = 'Period,Revenue,Written Off,Net Profit,Count\n';
    data.forEach(item => {
      const label = item.month || item.week || item.date;
      csv += `${label},${item.revenue},${item.writtenOff || 0},${item.netProfit || 0},${item.count}\n`;
    });
    
    csv += `\nSummary,,,,\n`;
    csv += `Total Revenue,${salesData.totalRevenue},,,,\n`;
    csv += `Total Written Off,${salesData.totalWrittenOff},,,,\n`;
    csv += `Net Profit,${salesData.netProfit},,,,\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${getTodayString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Fetch data on mount
  useEffect(() => {
    fetchReports();
    fetchFrequentCustomers();
  }, []);

  // Fetch sales data when reports are loaded
  useEffect(() => {
    if (reports.length > 0 || reports.length === 0) {
      fetchSalesData();
    }
  }, [reports]);

  // Refresh data
  const handleRefresh = async () => {
    await Promise.all([
      fetchReports(),
      fetchSalesData(),
      fetchFrequentCustomers()
    ]);
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Sales Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(salesData.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-blue-700" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Appointments</p>
              <p className="text-2xl font-bold text-green-700">{formatNumber(salesData.totalAppointments)}</p>
            </div>
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <Calendar size={24} className="text-green-700" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Written Off</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(salesData.totalWrittenOff)}</p>
            </div>
            <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
              <FileText size={24} className="text-red-700" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Net Profit</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(salesData.netProfit)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <select
            value={salesFilter}
            onChange={(e) => setSalesFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadSalesReport}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            title="Download CSV"
          >
            <Download size={18} />
            <span className="text-sm">Export CSV</span>
          </button>
          <button 
            onClick={exportAsPDF}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            title="Export as PDF"
          >
            <Printer size={18} />
            <span className="text-sm">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div id="sales-table-content" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-blue-500" />
              {salesFilter === 'daily' ? 'Daily Net Profit' :
               salesFilter === 'weekly' ? 'Weekly Net Profit' :
               'Monthly Net Profit'}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">
                {salesFilter === 'daily' ? 'Last 7 days' :
                 salesFilter === 'weekly' ? 'Last 7 weeks' :
                 'Last 6 months'}
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          {isLoadingSales ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : getChartData().length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {getChartData().map((item, index) => {
                  const label = item.month || item.week || item.date;
                  return (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{label}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{formatCurrency(item.revenue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.count}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(item.writtenOff || 0)}</td>
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
                  <td className="px-4 py-3 text-sm font-bold text-purple-600">{formatCurrency(salesData.netProfit)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Most Frequent Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                  className={`p-3 rounded-lg border ${getRankColor(index)} transition-all hover:shadow-md`}
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
                        {getRankIcon(index)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{customer.totalVisits} visit{customer.totalVisits > 1 ? 's' : ''}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-green-600 font-medium">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Last visit: {formatDate(customer.lastVisit)}
                      </p>
                      <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${
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
    </div>
  );
}

export default Sales;