import { useState, useEffect } from 'react';
import {
  Package, Search, Plus, CheckCircle, Clock, AlertCircle,
  AlertTriangle, X, Upload
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  in_stock: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  low:      { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  critical: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

function StatusPill({ status, label }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.in_stock;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border capitalize ${style.pill}`}>
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
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      {action}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    type === 'warning' ? { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertTriangle : AlertCircle;

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
function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockPrice, setRestockPrice] = useState('');
  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    lowStockCount: 0,
    criticalCount: 0,
  });

  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    product_quantity: '',
    current_usages: '',
    reorder_level: '',
    expiration_date: '',
    unit_price: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getCurrentUser = () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  };

  const sortInventoryByRecent = (inventoryArray) =>
    [...inventoryArray].sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      if (a.id && b.id) return b.id - a.id;
      return 0;
    });

  const computeStats = (items) => {
    let totalQuantity = 0, lowStockCount = 0, criticalCount = 0;
    items.forEach(item => {
      const qty = parseInt(item.product_quantity, 10) || 0;
      const perUnit = parseInt(item.estimated_usages_per_unit, 10) || 0;
      const openUsages = parseInt(item.current_usages, 10) || 0;
      const reorder = parseInt(item.reorder_level, 10) || 0;
      totalQuantity += qty;
      const remaining = qty > 0 ? (qty - 1) * perUnit + openUsages : 0;
      if (remaining <= reorder * 0.5) criticalCount++;
      else if (remaining <= reorder) lowStockCount++;
    });
    setStats({ totalProducts: items.length, totalQuantity, lowStockCount, criticalCount });
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        setFilteredProducts(response.data);
      }
    } catch {}
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/inventory');
      if (Array.isArray(response.data)) {
        const transformedData = response.data.map(item => ({
          ...item,
          product_name: item.products?.product_name || 'N/A',
          description: item.products?.description || 'N/A',
          unit: item.products?.unit || 'N/A',
          unit_size: item.products?.unit_size || 'N/A',
          estimated_usages_per_unit: item.products?.estimated_usages_per_unit || 0,
        }));
        const sortedData = sortInventoryByRecent(transformedData);
        setInventory(sortedData);
        computeStats(sortedData);
      }
    } catch {
      showToast('Failed to fetch inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (productSearch) {
      setFilteredProducts(products.filter(p =>
        p.product_name.toLowerCase().includes(productSearch.toLowerCase())
      ));
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  const getAvailableProducts = () => {
    const inventoryProductIds = inventory.map(item => item.product_id);
    return filteredProducts.filter(product => !inventoryProductIds.includes(product.id));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      product_id: product.id,
      product_name: product.product_name,
      product_quantity: '',
      current_usages: '',
      reorder_level: '',
      expiration_date: '',
      unit_price: '',
    }));
    setProductSearch(product.product_name);
    setShowProductDropdown(false);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!formData.product_id) return setFormError('Please select a product');
    if (!formData.product_quantity || parseInt(formData.product_quantity) <= 0) return setFormError('Please enter a valid quantity');
    if (!formData.current_usages || parseInt(formData.current_usages) < 0) return setFormError('Please enter valid current usages');
    if (!formData.reorder_level || parseInt(formData.reorder_level) < 0) return setFormError('Please enter a valid reorder level');
    if (!formData.expiration_date) return setFormError('Please select an expiration date');
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) return setFormError('Please enter a valid unit price');

    const existingItem = inventory.find(item => item.product_id === parseInt(formData.product_id));
    if (existingItem) return setFormError('This product already exists. Use Restock instead.');

    setIsLoading(true);
    try {
      await api.post('/inventory/add', {
        product_id: parseInt(formData.product_id),
        product_quantity: parseInt(formData.product_quantity),
        current_usages: parseInt(formData.current_usages),
        reorder_level: parseInt(formData.reorder_level),
        expiration_date: formData.expiration_date,
        unit_price: parseFloat(formData.unit_price),
      });

      const quantity = parseInt(formData.product_quantity);
      const totalAmount = parseFloat(formData.unit_price) * quantity;
      const recordedBy = getCurrentUser()?.id || 1;

      try {
        await api.post('/expenses/add', {
          expense_name: `New Stock: ${selectedProduct?.product_name || formData.product_name}`,
          amount: totalAmount,
          expense_date: new Date().toISOString().split('T')[0],
          description: 'restock',
          recorded_by: recordedBy,
          stock_amount: quantity,
        });
        showToast(`Stock added and expense recorded! (₱${totalAmount.toFixed(2)})`, 'success');
      } catch (expenseError) {
        const msg = expenseError.response?.data?.errors
          ? Object.values(expenseError.response.data.errors).flat().join(', ')
          : expenseError.response?.data?.message || 'Unknown error';
        showToast(`Stock added but expense failed: ${msg}`, 'warning');
      }

      setShowAddStockModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Error adding stock.');
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockQuantity || parseInt(restockQuantity) <= 0) return setFormError('Please enter a valid quantity');
    if (!restockPrice || parseFloat(restockPrice) <= 0) return setFormError('Please enter a valid price per unit');

    setIsLoading(true);
    try {
      await api.post(`/inventory/update/${editingItem.id}`, {
        product_id: parseInt(editingItem.product_id),
        product_quantity: parseInt(restockQuantity),
      });

      const quantity = parseInt(restockQuantity);
      const totalAmount = parseFloat(restockPrice) * quantity;
      const recordedBy = getCurrentUser()?.id || 1;

      try {
        await api.post('/expenses/add', {
          expense_name: `Restock: ${editingItem.product_name}`,
          amount: totalAmount,
          expense_date: new Date().toISOString().split('T')[0],
          description: 'restock',
          recorded_by: recordedBy,
          stock_amount: quantity,
        });
        showToast(`Stock restocked and expense recorded! (₱${totalAmount.toFixed(2)})`, 'success');
      } catch (expenseError) {
        const msg = expenseError.response?.data?.errors
          ? Object.values(expenseError.response.data.errors).flat().join(', ')
          : expenseError.response?.data?.message || 'Unknown error';
        showToast(`Restock saved but expense failed: ${msg}`, 'warning');
      }

      setShowRestockModal(false);
      setEditingItem(null);
      setRestockQuantity('');
      setRestockPrice('');
      fetchInventory();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error restocking';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '', product_name: '', product_quantity: '',
      current_usages: '', reorder_level: '', expiration_date: '', unit_price: '',
    });
    setSelectedProduct(null);
    setProductSearch('');
    setEditingItem(null);
    setFormError('');
    setShowProductDropdown(false);
    setRestockQuantity('');
    setRestockPrice('');
  };

  const handleOpenRestockModal = (item) => {
    setEditingItem(item);
    setRestockQuantity('');
    setRestockPrice('');
    setFormError('');
    setShowRestockModal(true);
  };

  const getStatusKey = (item) => {
    const remaining = (item.product_quantity * item.estimated_usages_per_unit) - item.current_usages;
    if (remaining <= item.reorder_level * 0.5) return 'critical';
    if (remaining <= item.reorder_level) return 'low';
    return 'in_stock';
  };

  const getStatusBadge = (item) => {
    const key = getStatusKey(item);
    const labels = { critical: 'Critical', low: 'Low Stock', in_stock: 'In Stock' };
    return <StatusPill status={key} label={labels[key]} />;
  };

  const filteredInventory = inventory.filter(item => {
    if (searchTerm && !(item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading && inventory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          sub={`${stats.totalQuantity} total units`}
          icon={Package}
          color="from-pink-500 to-pink-600"
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockCount}
          sub="Needs restocking soon"
          icon={Clock}
          color="from-amber-500 to-amber-600"
          badge="Attention"
          badgeClass="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Critical Stock"
          value={stats.criticalCount}
          sub="Restock immediately"
          icon={AlertTriangle}
          color="from-red-500 to-red-600"
          badge="Urgent"
          badgeClass="bg-red-50 text-red-600"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          {['table', 'cards'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode === 'table' ? 'Table View' : 'Cards View'}
            </button>
          ))}
        </div>

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
          <button
            onClick={() => { resetForm(); setShowAddStockModal(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
          >
            <Plus size={14} />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  {['Product', 'Quantity', 'Usage Left', 'Reorder Level', 'Stock Status', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-10">
                      <EmptyState icon={Package} title="No inventory items found" subtitle={'Click "Add Stock" to add your first product'} />
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-pink-50/40 transition-colors duration-200 group">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center text-pink-700 group-hover:scale-110 transition-transform">
                            <Package size={14} />
                          </div>
                          <span className="text-xs font-semibold text-slate-800">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap"><span className="text-xs text-slate-600">{item.product_quantity}</span></td>
                      <td className="px-5 py-3 whitespace-nowrap"><span className="text-xs text-slate-600">{item.current_usages}</span></td>
                      <td className="px-5 py-3 whitespace-nowrap"><span className="text-xs text-slate-600">{item.reorder_level}</span></td>
                      <td className="px-5 py-3 whitespace-nowrap">{getStatusBadge(item)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenRestockModal(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Restock"
                        >
                          <Package size={12} />
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-3">
            <p className="text-[11px] text-slate-500">
              Showing {filteredInventory.length} of {inventory.length} products
            </p>
          </div>
        </section>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInventory.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-2xl border border-slate-200/70 p-8">
                <EmptyState icon={Package} title="No inventory items found" subtitle={'Click "Add Stock" to add your first product'} />
              </div>
            </div>
          ) : (
            filteredInventory.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] transition-all duration-300 overflow-hidden">
                <div className="relative h-20 bg-gradient-to-r from-pink-500 to-fuchsia-600 p-3">
                  <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
                  <div className="relative flex items-center justify-between">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Package size={20} className="text-white" />
                    </div>
                    <div className="bg-white rounded-full px-1.5 py-0.5">
                      {getStatusBadge(item)}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1 truncate">{item.product_name}</h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{item.description}</p>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      ['Quantity', item.product_quantity],
                      ['Usage Left', item.current_usages],
                      ['Reorder Level', item.reorder_level],
                      ['Unit', `${item.unit} (${item.unit_size})`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[10px] text-slate-400">{k}</p>
                        <p className="text-xs font-semibold text-slate-800 truncate">{v}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleOpenRestockModal(item)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
                  >
                    <Package size={12} />
                    Restock
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus size={18} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Add New Stock</h2>
              </div>
              <button
                onClick={() => { setShowAddStockModal(false); resetForm(); }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="p-6 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Search Product <span className="text-pink-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowProductDropdown(true);
                          if (!e.target.value) {
                            setSelectedProduct(null);
                            setFormData(prev => ({
                              ...prev, product_id: '', product_name: '', product_quantity: '',
                              current_usages: '', reorder_level: '', expiration_date: '', unit_price: '',
                            }));
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        className={inputClass}
                        placeholder="Search for a product..."
                        required
                      />
                      {showProductDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {getAvailableProducts().length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500">
                              {filteredProducts.length === 0 ? 'No products found' : 'All products already have stock'}
                            </div>
                          ) : (
                            getAvailableProducts().map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductSelect(product)}
                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-pink-50 transition-colors border-b border-slate-100 last:border-b-0"
                              >
                                <div className="font-medium text-slate-800">{product.product_name}</div>
                                <div className="text-xs text-slate-500">
                                  {product.unit} ({product.unit_size}) - {product.estimated_usages_per_unit} usages
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedProduct && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-slate-500">Selected Product</p>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedProduct.product_name}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">Unit</p>
                          <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedProduct.unit} ({selectedProduct.unit_size})</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {[
                    ['Quantity', 'product_quantity', 'Enter quantity', 1],
                    ['Current Usages', 'current_usages', 'Current usages', 0],
                    ['Reorder Level', 'reorder_level', 'Reorder level', 0],
                  ].map(([label, name, placeholder, min]) => (
                    <div key={name}>
                      <label className={labelClass}>{label} <span className="text-pink-500">*</span></label>
                      <input
                        type="number"
                        name={name}
                        value={formData[name]}
                        onChange={handleInputChange}
                        className={inputClass}
                        placeholder={placeholder}
                        min={min}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Unit Price (₱) <span className="text-pink-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₱</span>
                    <input
                      type="number"
                      name="unit_price"
                      value={formData.unit_price}
                      onChange={handleInputChange}
                      className={`${inputClass} pl-8`}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Price per unit of this product</p>
                </div>
                <div>
                  <label className={labelClass}>Expiration Date <span className="text-pink-500">*</span></label>
                  <input
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {formData.product_quantity && formData.unit_price && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Value:</span>
                    <span className="text-xl font-bold text-blue-700">
                      ₱{(parseFloat(formData.unit_price) * parseInt(formData.product_quantity)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">This will be recorded as an expense</p>
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-700 font-semibold">Note:</p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                      Adding new stock will automatically create an expense entry with the total value,
                      recorded under "{selectedProduct?.product_name || 'New Product'}".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddStockModal(false); resetForm(); }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isLoading ? 'Adding...' : 'Add Stock & Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Upload size={18} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Restock Product</h2>
              </div>
              <button
                onClick={() => {
                  setShowRestockModal(false); setEditingItem(null);
                  setRestockQuantity(''); setRestockPrice(''); setFormError('');
                }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-6 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Product', editingItem.product_name],
                    ['Unit', `${editingItem.unit} (${editingItem.unit_size})`],
                    ['Current Quantity', editingItem.product_quantity],
                    ['Reorder Level', editingItem.reorder_level],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-[11px] text-slate-500">{k}</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Quantity to Add <span className="text-pink-500">*</span></label>
                <input
                  type="number"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  className={inputClass}
                  placeholder="Enter quantity to add"
                  min="1"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">This will be added to the current stock</p>
              </div>

              <div>
                <label className={labelClass}>Price per Unit (₱) <span className="text-pink-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">₱</span>
                  <input
                    type="number"
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(e.target.value)}
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">This will be recorded as an expense</p>
              </div>

              {restockQuantity && restockPrice && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Cost:</span>
                    <span className="text-xl font-bold text-blue-700">
                      ₱{(parseFloat(restockPrice) * parseInt(restockQuantity)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    This will be added to expenses as "Restock: {editingItem.product_name}"
                  </p>
                </div>
              )}

              <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-amber-700 font-semibold">Note:</p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                      Restocking this product will automatically create an expense entry with the total amount,
                      recorded under "{editingItem.product_name}" with description "restock".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false); setEditingItem(null);
                    setRestockQuantity(''); setRestockPrice(''); setFormError('');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isLoading ? 'Processing...' : 'Restock & Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;