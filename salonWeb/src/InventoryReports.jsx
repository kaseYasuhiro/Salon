import { useState, useEffect } from 'react';
import { 
  Package, Search, Download, Printer, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, History, X, Calendar, ArrowUpDown,
  BarChart3, Activity, Filter, Receipt, DollarSign
} from 'lucide-react';
import api from '../api/axios';

function InventoryReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Per-product transactions modal state
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  // Data states
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

  // Costs filter states
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [expenseDateRange, setExpenseDateRange] = useState({ startDate: '', endDate: '' });
  const [showExpenseDateFilter, setShowExpenseDateFilter] = useState(false);

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    criticalCount: 0,
    inStockCount: 0,
    totalRestocked: 0,
    totalUsed: 0,
    totalExpenses: 0
  });

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Sort inventory by recent
  const sortInventoryByRecent = (inventoryArray) => {
    return [...inventoryArray].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (a.id && b.id) {
        return b.id - a.id;
      }
      return 0;
    });
  };

  /**
   * Correct total remaining usages.
   *   remaining = (product_quantity - 1) * estimated_usages_per_unit + current_usages
   */
  const getRemainingUsages = (item) => {
    const bottles = parseInt(item.product_quantity, 10) || 0;
    const perUnit = parseInt(item.estimated_usages_per_unit, 10) || 0;
    const openUsages = parseInt(item.current_usages, 10) || 0;

    if (bottles <= 0) return 0;
    return Math.max(0, (bottles - 1) * perUnit + openUsages);
  };

  const getItemStatus = (item) => {
    const remainingUsages = getRemainingUsages(item);
    const reorderPoint = parseInt(item.reorder_level, 10) || 0;

    if (remainingUsages <= reorderPoint * 0.5) return 'critical';
    if (remainingUsages <= reorderPoint) return 'low_stock';
    return 'in_stock';
  };

  // Fetch inventory
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/inventory');
      console.log('Fetched inventory:', response.data);

      if (Array.isArray(response.data)) {
        const transformedData = response.data.map(item => {
          const normalized = {
            ...item,
            product_name: item.products?.product_name || 'N/A',
            description: item.products?.description || 'N/A',
            unit: item.products?.unit || 'N/A',
            unit_size: item.products?.unit_size || 'N/A',
            estimated_usages_per_unit: item.products?.estimated_usages_per_unit || 0,
          };
          return {
            ...normalized,
            status: getItemStatus(normalized)
          };
        });

        const sortedData = sortInventoryByRecent(transformedData);
        setInventory(sortedData);

        const lowStockItems = sortedData.filter(item => {
          const remaining = getRemainingUsages(item);
          const reorder = parseInt(item.reorder_level, 10) || 0;
          return remaining <= reorder && remaining > reorder * 0.5;
        }).length;

        const criticalItems = sortedData.filter(item => {
          const remaining = getRemainingUsages(item);
          const reorder = parseInt(item.reorder_level, 10) || 0;
          return remaining <= reorder * 0.5;
        }).length;

        const inStockItems = sortedData.filter(item => {
          const remaining = getRemainingUsages(item);
          const reorder = parseInt(item.reorder_level, 10) || 0;
          return remaining > reorder;
        }).length;

        const totalValue = sortedData.reduce((sum, item) =>
          sum + ((item.product_quantity || 0) * (item.unit_price || 0)), 0
        );

        setSummaryStats(prev => ({
          ...prev,
          totalProducts: sortedData.length,
          totalValue,
          lowStockCount: lowStockItems,
          criticalCount: criticalItems,
          inStockCount: inStockItems
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showToast('Failed to fetch inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch inventory transactions
  const fetchInventoryTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await api.get('/inventory/transactions');
      console.log('Fetched inventory transactions:', response.data);

      if (Array.isArray(response.data)) {
        setTransactions(response.data);

        const totalRestocked = response.data
          .filter(t => t.transaction_type === 'restock' || t.quantity_change > 0)
          .reduce((sum, t) => sum + Math.abs(t.quantity_change || 0), 0);

        const totalUsed = response.data
          .filter(t => t.transaction_type === 'usage' || t.quantity_change < 0)
          .reduce((sum, t) => sum + Math.abs(t.quantity_change || 0), 0);

        setSummaryStats(prev => ({
          ...prev,
          totalRestocked,
          totalUsed
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      showToast('Failed to fetch transactions', 'error');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    setIsLoadingExpenses(true);
    try {
      const response = await api.get('/expenses');
      console.log('Fetched expenses:', response.data);

      const raw = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      const normalized = raw
        .map(item => ({
          id: item.id,
          expense_name: item.expense_name || 'N/A',
          amount: parseFloat(item.amount) || 0,
          expense_date: item.expense_date || (item.created_at ? item.created_at.split('T')[0] : null),
          description: item.description || 'N/A',
          recorded_by:
            item.employees?.name ||
            item.employee?.name ||
            item.recorded_by_name ||
            (item.recorded_by ? `User #${item.recorded_by}` : 'N/A'),
          stock_amount: item.stock_amount || 0,
          created_at: item.created_at || null
        }))
        .sort((a, b) => {
          if (!a.expense_date) return 1;
          if (!b.expense_date) return -1;
          return b.expense_date.localeCompare(a.expense_date);
        });

      setExpenses(normalized);

      const totalExpenses = normalized.reduce((sum, e) => sum + (e.amount || 0), 0);
      setSummaryStats(prev => ({
        ...prev,
        totalExpenses
      }));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast('Failed to fetch expenses', 'error');
      setExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchInventoryTransactions();
    fetchExpenses();
  }, []);

  const getProductName = (inventoryId) => {
    const item = inventory.find(i => i.id === inventoryId);
    return item?.product_name || `Product #${inventoryId}`;
  };

  const getProductUnit = (inventoryId) => {
    const item = inventory.find(i => i.id === inventoryId);
    if (!item) return '';
    return item.unit !== 'N/A' ? item.unit : '';
  };

  const filteredInventory = inventory.filter(item => {
    if (searchTerm && !(item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const filteredExpenses = expenses.filter(expense => {
    if (expenseSearchTerm) {
      const term = expenseSearchTerm.toLowerCase();
      const name = (expense.expense_name || '').toLowerCase();
      const desc = (expense.description || '').toLowerCase();
      const recordedBy = (expense.recorded_by || '').toLowerCase();
      if (!name.includes(term) && !desc.includes(term) && !recordedBy.includes(term)) {
        return false;
      }
    }
    if (expenseDateRange.startDate && expense.expense_date) {
      if (expense.expense_date < expenseDateRange.startDate) return false;
    }
    if (expenseDateRange.endDate && expense.expense_date) {
      if (expense.expense_date > expenseDateRange.endDate) return false;
    }
    return true;
  });

  const filteredExpensesTotal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'in_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
            <CheckCircle size={10} />
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
            <Clock size={10} />
            Low Stock
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle size={10} />
            Critical
          </span>
        );
      default:
        return null;
    }
  };

  const getTransactionTypeBadge = (transaction) => {
    const type = transaction.transaction_type || (transaction.quantity_change > 0 ? 'restock' : 'usage');

    switch(type) {
      case 'usage':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
            <TrendingDown size={10} />
            Usage
          </span>
        );
      case 'restock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
            <TrendingUp size={10} />
            Restock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {type}
          </span>
        );
    }
  };

  const formatCurrency = (amount) => {
    return `${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ₱`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchInventory(),
      fetchInventoryTransactions(),
      fetchExpenses()
    ]);
    setLastUpdated(new Date());
    showToast('Data refreshed successfully!', 'success');
  };

  // Open per-product transaction history
  const handleOpenTransactionsModal = (item) => {
    setSelectedInventoryItem(item);
    setShowTransactionsModal(true);
  };

  // Transactions for the currently selected item
  const getItemTransactions = () => {
    if (!selectedInventoryItem) return [];
    return transactions
      .filter(t => t.inventory_id === selectedInventoryItem.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const handleExportCSV = () => {
    let csv = '';

    csv += `"INVENTORY REPORTS"\n`;
    csv += `"Generated:","${new Date().toLocaleString()}"\n\n`;

    csv += `"=== INVENTORY STOCK ==="\n`;
    csv += `"Product Name","Unit","Unit Size","Quantity","Usage Left","Reorder Level","Status"\n`;
    filteredInventory.forEach(item => {
      csv += `"${item.product_name}","${item.unit}","${item.unit_size}","${item.product_quantity}","${getRemainingUsages(item)}","${item.reorder_level}","${item.status}"\n`;
    });

    csv += `\n\n`;

    csv += `"=== COSTS (EXPENSES) ==="\n`;
    csv += `"Expense Name","Amount","Expense Date","Description","Recorded By","Stock Amount"\n`;
    filteredExpenses.forEach(e => {
      csv += `"${e.expense_name}","${e.amount}","${e.expense_date || 'N/A'}","${e.description}","${e.recorded_by}","${e.stock_amount}"\n`;
    });
    csv += `"TOTAL","${filteredExpensesTotal}","","","",""\n`;

    csv += `\n`;
    csv += `"Report generated automatically. All amounts are in Philippine Pesos (₱)."\n`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('CSV exported successfully!', 'success');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      showToast('Please allow popups to print', 'error');
      return;
    }

    let inventoryRows = '';
    filteredInventory.forEach(item => {
      inventoryRows += `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.unit} (${item.unit_size})</td>
          <td class="currency">${item.product_quantity}</td>
          <td class="currency">${getRemainingUsages(item)}</td>
          <td class="currency">${item.reorder_level}</td>
          <td>${item.status.replace('_', ' ').toUpperCase()}</td>
        </tr>
      `;
    });

    let expenseRows = '';
    filteredExpenses.forEach(e => {
      expenseRows += `
        <tr>
          <td>${e.expense_name}</td>
          <td class="currency">${formatCurrency(e.amount)}</td>
          <td>${e.expense_date ? formatDate(e.expense_date) : 'N/A'}</td>
          <td>${e.description}</td>
          <td>${e.recorded_by}</td>
          <td class="currency">${e.stock_amount || 0}</td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Report</title>
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
            .currency { text-align: right; color: #000; }
            .total-row { background-color: #f9fafb; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Reshel Oco Hair Salon</p>
          </div>

          <div class="section">
            <h2>Inventory Stock (${filteredInventory.length} products)</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Usage Left</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${inventoryRows || '<tr><td colspan="6" style="text-align:center;color:#999;">No inventory data available</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="page-break"></div>

          <div class="section">
            <h2>Costs / Expenses (${filteredExpenses.length} entries)</h2>
            <table>
              <thead>
                <tr>
                  <th>Expense Name</th>
                  <th>Amount</th>
                  <th>Expense Date</th>
                  <th>Description</th>
                  <th>Recorded By</th>
                  <th>Stock Amount</th>
                </tr>
              </thead>
              <tbody>
                ${expenseRows || '<tr><td colspan="6" style="text-align:center;color:#999;">No expense data available</td></tr>'}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td>Total</td>
                  <td class="currency">${formatCurrency(filteredExpensesTotal)}</td>
                  <td colspan="4"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="footer">
            <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500' : 
            toast.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : toast.type === 'warning' ? (
              <AlertTriangle size={20} />
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
            Inventory Reports
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            View stock levels and transaction history
          </p>
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
            onClick={handleExportCSV}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            <span className="text-sm hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Printer size={18} />
            <span className="text-sm hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Package className="text-blue-600" size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Total Products</p>
          <p className="text-xl font-bold text-gray-800 mt-0.5">{summaryStats.totalProducts}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="text-green-600" size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500">In Stock</p>
          <p className="text-xl font-bold text-green-700 mt-0.5">{summaryStats.inStockCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="text-yellow-600" size={18} />
            </div>
            <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
              Attention
            </span>
          </div>
          <p className="text-xs text-gray-500">Low Stock Items</p>
          <p className="text-xl font-bold text-yellow-600 mt-0.5">{summaryStats.lowStockCount}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="text-red-600" size={18} />
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              Urgent
            </span>
          </div>
          <p className="text-xs text-gray-500">Critical Stock</p>
          <p className="text-xl font-bold text-red-600 mt-0.5">{summaryStats.criticalCount}</p>
        </div>
      </div>

      {/* Stock Movement Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-lg shadow-sm">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Restocked</p>
              <p className="text-2xl font-bold text-green-700">+{summaryStats.totalRestocked}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">units (all time)</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-lg shadow-sm">
              <TrendingDown className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Used</p>
              <p className="text-2xl font-bold text-red-700">-{summaryStats.totalUsed}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">units (all time)</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-lg shadow-sm">
              <Activity className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-600">Net Movement</p>
              <p className={`text-2xl font-bold ${
                summaryStats.totalRestocked - summaryStats.totalUsed >= 0 
                  ? 'text-green-700' 
                  : 'text-red-700'
              }`}>
                {summaryStats.totalRestocked - summaryStats.totalUsed >= 0 ? '+' : ''}
                {summaryStats.totalRestocked - summaryStats.totalUsed}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">units net change</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== INVENTORY TABLE ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Package size={16} className="text-blue-500" />
              Inventory Stock
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {filteredInventory.length} of {inventory.length} products
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Quantity
                    <ArrowUpDown size={10} className="text-gray-400" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Usage Left</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Reorder Level</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                {/* ✅ New Actions column */}
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading inventory...</p>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <Package size={40} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No inventory data found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/30 transition-colors duration-200"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package size={14} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-black truncate max-w-[200px]">
                            {item.product_name}
                          </p>
                          {item.description && item.description !== 'N/A' && (
                            <p className="text-[10px] text-black truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-black">
                        {item.unit !== 'N/A' ? `${item.unit} (${item.unit_size})` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-black">{item.product_quantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-black">{getRemainingUsages(item)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-black">{item.reorder_level}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    {/* ✅ Per-product history button */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenTransactionsModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-xs font-medium"
                        title="View transaction history"
                      >
                        <History size={12} />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredInventory.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan="2" className="px-4 py-3 text-sm font-bold text-black">
                    Total ({filteredInventory.length} products)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-black">
                    {filteredInventory.reduce((sum, i) => sum + (i.product_quantity || 0), 0)}
                  </td>
                  <td colSpan="4" className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-500">
            Showing {filteredInventory.length} of {inventory.length} products
          </p>
          <p className="text-[10px] text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>
      </div>

      {/* ===== COSTS TABLE (EXPENSES) ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Receipt size={16} className="text-red-500" />
              Costs
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {filteredExpenses.length} of {expenses.length} expenses
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-52"
              />
            </div>

            <button
              onClick={() => setShowExpenseDateFilter(!showExpenseDateFilter)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar size={14} />
              <span>Date Range</span>
              {(expenseDateRange.startDate || expenseDateRange.endDate) && (
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>

        {showExpenseDateFilter && (
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">From:</span>
              <input
                type="date"
                value={expenseDateRange.startDate}
                onChange={(e) => setExpenseDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">To:</span>
              <input
                type="date"
                value={expenseDateRange.endDate}
                onChange={(e) => setExpenseDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={() => {
                setExpenseDateRange({ startDate: '', endDate: '' });
                setShowExpenseDateFilter(false);
              }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <X size={12} />
              Clear
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Expense Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Expense Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Recorded By</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Stock Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingExpenses ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading expenses...</p>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center">
                    <Receipt size={40} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No expense records found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {expenses.length === 0 
                        ? 'Expenses will appear here once stock is added or restocked' 
                        : 'Try adjusting your filters'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-red-50/30 transition-colors duration-200"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Receipt size={14} className="text-red-500" />
                        </div>
                        <span className="text-sm font-semibold text-black truncate max-w-[220px]">
                          {expense.expense_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold text-black">
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="text-sm text-black">
                          {expense.expense_date ? formatDate(expense.expense_date) : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-black capitalize">
                        {expense.description}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-black">
                        {expense.recorded_by}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-semibold text-black">
                        {expense.stock_amount || 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-black">
                    Total ({filteredExpenses.length} entries)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-black">
                    {formatCurrency(filteredExpensesTotal)}
                  </td>
                  <td colSpan="4" className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-500">
            Showing {filteredExpenses.length} of {expenses.length} expenses
          </p>
          <p className="text-[10px] text-gray-400">
            Total: {formatCurrency(summaryStats.totalExpenses)}
          </p>
        </div>
      </div>

      {/* ===== PER-PRODUCT TRANSACTIONS MODAL ===== */}
      {showTransactionsModal && selectedInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[85vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-white">Transaction History</h2>
                <p className="text-pink-100 text-sm mt-0.5">
                  {selectedInventoryItem.product_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTransactionsModal(false);
                  setSelectedInventoryItem(null);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 'calc(85vh - 72px)' }}
            >
              {/* Product Info Summary */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Current Quantity</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedInventoryItem.product_quantity}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Usage Left</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {getRemainingUsages(selectedInventoryItem)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Reorder Level</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedInventoryItem.reorder_level}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Unit</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {selectedInventoryItem.unit}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Transaction ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getItemTransactions().length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-gray-500 text-sm">
                            No transactions found for this product
                          </td>
                        </tr>
                      ) : (
                        getItemTransactions().map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="hover:bg-gray-50/50 transition-colors duration-200"
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {getTransactionTypeBadge(transaction)}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={`text-sm font-semibold ${
                                transaction.quantity_change < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {transaction.quantity_change > 0 ? '+' : ''}
                                {transaction.quantity_change}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                              #{transaction.transaction_id || transaction.id || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                              {formatDateTime(transaction.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowTransactionsModal(false);
                    setSelectedInventoryItem(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryReports;