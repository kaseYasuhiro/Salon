import { useState, useEffect } from 'react';
import {
  Package, Search, Download, Printer, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, History, X, Calendar, ArrowUpDown,
  BarChart3, Activity,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  in_stock:  { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  low_stock: { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  critical:  { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

// Custom Receipt icon with a Peso sign (replaces the default dollar sign)
const ReceiptPeso = ({ size = 24, className = '' }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
        <path d="M8 7h8" />
        <path d="M8 12h8" />
        <path d="M8 17h8" />
      </svg>
      <span
        className="absolute font-bold pointer-events-none"
        style={{ fontSize: size * 0.45, lineHeight: 1 }}
      >
        ₱
      </span>
    </div>
  );
};

function StatusPill({ status, label }) {
  const style = STATUS_STYLES[status] || { pill: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
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
      <header className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
        <Icon size={26} className="text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertTriangle : AlertTriangle;

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

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
function InventoryReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);

  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);

  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [expenseDateRange, setExpenseDateRange] = useState({ startDate: '', endDate: '' });
  const [showExpenseDateFilter, setShowExpenseDateFilter] = useState(false);

  const [inventoryPage, setInventoryPage] = useState(1);
  const inventoryItemsPerPage = 5;

  const [expensePage, setExpensePage] = useState(1);
  const expenseItemsPerPage = 5;

  const [summaryStats, setSummaryStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    criticalCount: 0,
    inStockCount: 0,
    totalRestocked: 0,
    totalUsed: 0,
    totalExpenses: 0,
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const sortInventoryByRecent = (inventoryArray) =>
    [...inventoryArray].sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      if (a.id && b.id) return b.id - a.id;
      return 0;
    });

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

  const getFullName = (person) => {
    if (!person) return null;
    if (person.first_name || person.last_name) {
      return `${person.first_name || ''} ${person.last_name || ''}`.trim() || null;
    }
    if (person.user && (person.user.first_name || person.user.last_name)) {
      return `${person.user.first_name || ''} ${person.user.last_name || ''}`.trim() || null;
    }
    if (person.employee && (person.employee.first_name || person.employee.last_name)) {
      return `${person.employee.first_name || ''} ${person.employee.last_name || ''}`.trim() || null;
    }
    if (person.employees && (person.employees.first_name || person.employees.last_name)) {
      return `${person.employees.first_name || ''} ${person.employees.last_name || ''}`.trim() || null;
    }
    if (person.name) return person.name;
    return null;
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/inventory');
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
          return { ...normalized, status: getItemStatus(normalized) };
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
          sum + ((item.product_quantity || 0) * (item.unit_price || 0)), 0);

        setSummaryStats(prev => ({
          ...prev,
          totalProducts: sortedData.length,
          totalValue,
          lowStockCount: lowStockItems,
          criticalCount: criticalItems,
          inStockCount: inStockItems,
        }));
      }
    } catch {
      showToast('Failed to fetch inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await api.get('/inventory/transactions');
      if (Array.isArray(response.data)) {
        setTransactions(response.data);
        const totalRestocked = response.data
          .filter(t => t.transaction_type === 'restock' || t.quantity_change > 0)
          .reduce((sum, t) => sum + Math.abs(t.quantity_change || 0), 0);
        const totalUsed = response.data
          .filter(t => t.transaction_type === 'usage' || t.quantity_change < 0)
          .reduce((sum, t) => sum + Math.abs(t.quantity_change || 0), 0);
        setSummaryStats(prev => ({ ...prev, totalRestocked, totalUsed }));
      }
    } catch {
      showToast('Failed to fetch transactions', 'error');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchExpenses = async () => {
    setIsLoadingExpenses(true);
    try {
      const response = await api.get('/expenses');
      const raw = Array.isArray(response.data) ? response.data
        : Array.isArray(response.data?.data) ? response.data.data : [];

      const normalized = raw.map(item => ({
        id: item.id,
        expense_name: item.expense_name || 'N/A',
        amount: parseFloat(item.amount) || 0,
        expense_date: item.expense_date || (item.created_at ? item.created_at.split('T')[0] : null),
        description: item.description || 'N/A',
        recorded_by:
          getFullName(item.employees) ||
          getFullName(item.employee) ||
          getFullName(item.user) ||
          item.recorded_by_name ||
          (item.recorded_by ? `User #${item.recorded_by}` : 'N/A'),
        stock_amount: item.stock_amount || 0,
        created_at: item.created_at || null,
      })).sort((a, b) => {
        if (!a.expense_date) return 1;
        if (!b.expense_date) return -1;
        return b.expense_date.localeCompare(a.expense_date);
      });

      setExpenses(normalized);
      const totalExpenses = normalized.reduce((sum, e) => sum + (e.amount || 0), 0);
      setSummaryStats(prev => ({ ...prev, totalExpenses }));
    } catch {
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
      if (!name.includes(term) && !desc.includes(term) && !recordedBy.includes(term)) return false;
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

  const totalInventoryPages = Math.ceil(filteredInventory.length / inventoryItemsPerPage);
  const inventoryStartIndex = (inventoryPage - 1) * inventoryItemsPerPage;
  const paginatedInventory = filteredInventory.slice(inventoryStartIndex, inventoryStartIndex + inventoryItemsPerPage);

  const handleNextInventoryPage = () => { if (inventoryPage < totalInventoryPages) setInventoryPage(prev => prev + 1); };
  const handlePrevInventoryPage = () => { if (inventoryPage > 1) setInventoryPage(prev => prev - 1); };

  const totalExpensePages = Math.ceil(filteredExpenses.length / expenseItemsPerPage);
  const expenseStartIndex = (expensePage - 1) * expenseItemsPerPage;
  const paginatedExpenses = filteredExpenses.slice(expenseStartIndex, expenseStartIndex + expenseItemsPerPage);

  const handleNextExpensePage = () => { if (expensePage < totalExpensePages) setExpensePage(prev => prev + 1); };
  const handlePrevExpensePage = () => { if (expensePage > 1) setExpensePage(prev => prev - 1); };

  useEffect(() => { setInventoryPage(1); }, [searchTerm, filterStatus]);
  useEffect(() => { setExpensePage(1); }, [expenseSearchTerm, expenseDateRange]);

  const getStatusBadge = (status) => {
    const labels = { in_stock: 'In Stock', low_stock: 'Low Stock', critical: 'Critical' };
    return <StatusPill status={status} label={labels[status] || status} />;
  };

  const getTransactionTypeBadge = (transaction) => {
    const type = transaction.transaction_type || (transaction.quantity_change > 0 ? 'restock' : 'usage');
    if (type === 'usage') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border bg-red-50 text-red-700 border-red-200">
          <TrendingDown size={10} />
          Usage
        </span>
      );
    }
    if (type === 'restock') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
          <TrendingUp size={10} />
          Restock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-600 border-slate-200">
        {type}
      </span>
    );
  };

  // Removed the peso sign here; the column header handles it now
  const formatCurrency = (amount) =>
    `${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const handleRefresh = async () => {
    await Promise.all([fetchInventory(), fetchInventoryTransactions(), fetchExpenses()]);
    setLastUpdated(new Date());
    showToast('Data refreshed successfully!', 'success');
  };

  const handleOpenTransactionsModal = (item) => {
    setSelectedInventoryItem(item);
    setShowTransactionsModal(true);
  };

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
          <td class="currency">₱${formatCurrency(e.amount)}</td>
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
            th.currency { text-align: right; }
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
                <tr><th>Product</th><th>Unit</th><th class="currency">Quantity</th><th class="currency">Usage Left</th><th class="currency">Reorder Level</th><th>Status</th></tr>
              </thead>
              <tbody>${inventoryRows || '<tr><td colspan="6" style="text-align:center;color:#999;">No inventory data available</td></tr>'}</tbody>
            </table>
          </div>
          <div class="page-break"></div>
          <div class="section">
            <h2>Costs / Expenses (${filteredExpenses.length} entries)</h2>
            <table>
              <thead>
                <tr><th>Expense Name</th><th class="currency">Amount (₱)</th><th>Expense Date</th><th>Description</th><th>Recorded By</th><th class="currency">Stock Amount</th></tr>
              </thead>
              <tbody>${expenseRows || '<tr><td colspan="6" style="text-align:center;color:#999;">No expense data available</td></tr>'}</tbody>
              <tfoot>
                <tr class="total-row">
                  <td>Total</td>
                  <td class="currency">₱${formatCurrency(filteredExpensesTotal)}</td>
                  <td colspan="4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div class="footer">
            <p>This report was generated automatically. All amounts are in Philippine Pesos (₱).</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center shadow-md">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Inventory Reports</h2>
            <p className="text-xs text-slate-500">View stock levels and transaction history</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold"
            title="Download CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-500 to-sky-600 text-white rounded-xl shadow-sm shadow-blue-500/30 hover:shadow-md transition-all text-xs font-semibold"
            title="Print report"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={summaryStats.totalProducts}
          sub={`₱${parseFloat(summaryStats.totalValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} inventory value`}
          icon={Package}
          color="from-blue-500 to-sky-600"
        />
        <StatCard
          label="In Stock"
          value={summaryStats.inStockCount}
          sub="Healthy stock levels"
          icon={CheckCircle}
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          label="Low Stock Items"
          value={summaryStats.lowStockCount}
          sub="Needs restocking soon"
          icon={Clock}
          color="from-amber-500 to-amber-600"
          badge={summaryStats.lowStockCount > 0 ? 'Attention' : null}
          badgeClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Critical Stock"
          value={summaryStats.criticalCount}
          sub="Restock immediately"
          icon={AlertTriangle}
          color="from-red-500 to-red-600"
          badge={summaryStats.criticalCount > 0 ? 'Urgent' : null}
          badgeClass="bg-red-50 text-red-600"
        />
      </div>

      {/* INVENTORY TABLE */}
      <Panel
        title="Inventory Stock"
        subtitle={`${filteredInventory.length} of ${inventory.length} products`}
        icon={Package}
        iconClass="bg-blue-50 text-blue-500"
        bodyClassName=""
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent w-52 transition-all"
              />
            </div>
            <div className="inline-flex bg-slate-100 rounded-xl p-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'in_stock', label: 'In Stock' },
                { key: 'low_stock', label: 'Low' },
                { key: 'critical', label: 'Critical' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterStatus(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterStatus === key ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80">
              <tr>
                {['Product', 'Unit', 'Quantity', 'Usage Left', 'Reorder Level', 'Status', 'Actions'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${
                    ['Quantity', 'Usage Left', 'Reorder Level'].includes(h) ? 'text-right' : ''
                  }`}>
                    {h === 'Quantity' ? (
                      <div className="flex items-center justify-end gap-1">
                        {h}
                        <ArrowUpDown size={10} className="text-slate-400" />
                      </div>
                    ) : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-slate-500">Loading inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10">
                    <EmptyState
                      icon={Package}
                      title="No inventory data found"
                      subtitle="Try adjusting your filters or search term"
                    />
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-pink-50/40 transition-colors duration-200 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <Package size={14} className="text-pink-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                            {item.product_name}
                          </p>
                          {item.description && item.description !== 'N/A' && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-slate-600">
                        {item.unit !== 'N/A' ? `${item.unit} (${item.unit_size})` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-semibold text-slate-800">{item.product_quantity}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-semibold text-slate-800">{getRemainingUsages(item)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs text-slate-600">{item.reorder_level}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenTransactionsModal(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-pink-600 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-colors"
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
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan="2" className="px-4 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Total ({filteredInventory.length} products)
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-slate-800">
                    {filteredInventory.reduce((sum, i) => sum + (i.product_quantity || 0), 0)}
                  </td>
                  <td colSpan="4" className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-slate-500">
            Showing {filteredInventory.length > 0 ? inventoryStartIndex + 1 : 0} to {Math.min(inventoryStartIndex + inventoryItemsPerPage, filteredInventory.length)} of {filteredInventory.length} products
          </p>
          {totalInventoryPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevInventoryPage}
                disabled={inventoryPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-600 px-3 font-semibold">
                Page {inventoryPage} of {totalInventoryPages}
              </span>
              <button
                onClick={handleNextInventoryPage}
                disabled={inventoryPage >= totalInventoryPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>
        </div>
      </Panel>

      {/* COSTS TABLE */}
      <Panel
        title="Costs"
        subtitle={`${filteredExpenses.length} of ${expenses.length} expenses`}
        icon={ReceiptPeso}
        iconClass="bg-red-50 text-red-500"
        bodyClassName=""
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={expenseSearchTerm}
                onChange={(e) => setExpenseSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent w-52 transition-all"
              />
            </div>
            <button
              onClick={() => setShowExpenseDateFilter(!showExpenseDateFilter)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
            >
              <Calendar size={14} />
              <span>Date Range</span>
              {(expenseDateRange.startDate || expenseDateRange.endDate) && (
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        }
      >
        {showExpenseDateFilter && (
          <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">From:</span>
              <input
                type="date"
                value={expenseDateRange.startDate}
                onChange={(e) => setExpenseDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">To:</span>
              <input
                type="date"
                value={expenseDateRange.endDate}
                onChange={(e) => setExpenseDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <button
              onClick={() => {
                setExpenseDateRange({ startDate: '', endDate: '' });
                setShowExpenseDateFilter(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
            >
              <X size={12} />
              Clear
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80">
              <tr>
                {['Expense Name', 'Amount (₱)', 'Expense Date', 'Description', 'Recorded By', 'Stock Amount (₱)'].map((h) => (
                  <th key={h} className={`px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${
                    ['Amount (₱)', 'Stock Amount (₱)'].includes(h) ? 'text-right' : ''
                  }`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingExpenses ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-slate-500">Loading expenses...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10">
                    <EmptyState
                      icon={ReceiptPeso}
                      title="No expense records found"
                      subtitle={
                        expenses.length === 0
                          ? 'Expenses will appear here once stock is added or restocked'
                          : 'Try adjusting your filters'
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-pink-50/40 transition-colors duration-200 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                          <ReceiptPeso size={14} className="text-red-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[220px]">
                          {expense.expense_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-bold text-red-600">{formatCurrency(expense.amount)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {expense.expense_date ? formatDate(expense.expense_date) : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 capitalize">{expense.description}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-slate-600">{expense.recorded_by}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-xs font-semibold text-slate-800">{expense.stock_amount || 0}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3 text-right text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Total ({filteredExpenses.length} entries)
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-red-600">
                    {formatCurrency(filteredExpensesTotal)}
                  </td>
                  <td colSpan="4" className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-slate-500">
            Showing {filteredExpenses.length > 0 ? expenseStartIndex + 1 : 0} to {Math.min(expenseStartIndex + expenseItemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
          </p>
          {totalExpensePages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevExpensePage}
                disabled={expensePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-slate-600 px-3 font-semibold">
                Page {expensePage} of {totalExpensePages}
              </span>
              <button
                onClick={handleNextExpensePage}
                disabled={expensePage >= totalExpensePages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <p className="text-[10px] text-slate-400">
            Total: {formatCurrency(summaryStats.totalExpenses)}
          </p>
        </div>
      </Panel>

      {/* PER-PRODUCT TRANSACTIONS MODAL */}
      {showTransactionsModal && selectedInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <History size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Transaction History</h2>
                  <p className="text-[11px] text-pink-100 mt-0.5">{selectedInventoryItem.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowTransactionsModal(false); setSelectedInventoryItem(null); }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Product info summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Current Quantity', value: selectedInventoryItem.product_quantity },
                  { label: 'Usage Left', value: getRemainingUsages(selectedInventoryItem) },
                  { label: 'Reorder Level', value: selectedInventoryItem.reorder_level },
                  { label: 'Unit', value: selectedInventoryItem.unit },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {isLoadingTransactions ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full">
                    <thead className="bg-slate-50/80">
                      <tr>
                        {['Type', 'Quantity', 'Transaction ID', 'Date'].map((h) => (
                          <th key={h} className={`px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider ${
                            h === 'Quantity' ? 'text-right' : ''
                          }`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getItemTransactions().length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-8">
                            <EmptyState
                              icon={History}
                              title="No transactions found"
                              subtitle="This product has no recorded transactions yet"
                            />
                          </td>
                        </tr>
                      ) : (
                        getItemTransactions().map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-pink-50/40 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {getTransactionTypeBadge(transaction)}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-right">
                              <span className={`text-xs font-semibold ${
                                transaction.quantity_change < 0 ? 'text-red-600' : 'text-emerald-600'
                              }`}>
                                {transaction.quantity_change > 0 ? '+' : ''}
                                {transaction.quantity_change}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600">
                              #{transaction.transaction_id || transaction.id || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600">
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
                  onClick={() => { setShowTransactionsModal(false); setSelectedInventoryItem(null); }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
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