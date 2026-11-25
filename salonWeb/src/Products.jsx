import { useState, useEffect } from 'react';
import {
  Package, Search, Plus, Edit, X, AlertCircle, CheckCircle,
  Box, Ruler, Layers, EyeOff, Image as ImageIcon
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/auth-context';

// ─────────────────────────────────────────────────────────────
// Design tokens (mirrors Dashboard.jsx / Inventory.jsx)
// ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  active:   { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  inactive: { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
};

function StatusPill({ status, label }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.active;
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
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Toast({ message, type = 'success', onClose }) {
  const accent =
    type === 'success' ? { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600' } :
    { bar: 'bg-red-500', icon: 'bg-red-100 text-red-600' };
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

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
function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const [formData, setFormData] = useState({
    product_name: '',
    unit: '',
    unit_size: '',
    estimated_usages_per_unit: '',
    is_active: true,
  });

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUnits: 0,
    inactiveProducts: 0,
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const sortProductsByRecent = (productsArray) =>
    [...productsArray].sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      if (a.id && b.id) return b.id - a.id;
      return 0;
    });

  const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.73:8000/api';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage/')) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/storage/${imagePath}`;
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/products');
      if (Array.isArray(response.data)) {
        const sortedProducts = sortProductsByRecent(response.data);
        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts);

        setStats({
          totalProducts: sortedProducts.length,
          totalUnits: sortedProducts.reduce((sum, p) => sum + (parseFloat(p.unit_size) || 0), 0),
          inactiveProducts: sortedProducts.filter(p => p.is_active === 0 || p.is_active === false).length,
        });
      }
    } catch {
      showToast('Failed to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setIsImageRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setProductImage(null);
    setIsImageRemoved(true);
    const fileInput = document.getElementById('product_image');
    if (fileInput) fileInput.value = '';
  };

  // Default description used whenever the UI doesn't collect one.
  const buildDefaultDescription = (productName) =>
    `${(productName || '').trim() || 'Product'} product.`;

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.unit || !formData.unit_size || !formData.estimated_usages_per_unit) {
      return showToast('Please fill in all required fields', 'error');
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('product_name', formData.product_name);
      // Default description — the UI no longer collects it.
      fd.append('description', buildDefaultDescription(formData.product_name));
      fd.append('unit', formData.unit);
      fd.append('unit_size', parseFloat(formData.unit_size));
      fd.append('estimated_usages_per_unit', parseFloat(formData.estimated_usages_per_unit));
      fd.append('is_active', formData.is_active ? 1 : 0);
      if (productImage) fd.append('product_image', productImage);

      const response = await api.post('/products/add', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(response.data.message || 'Product added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      const msg = error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Failed to add product. Please try again.');
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.unit || !formData.unit_size || !formData.estimated_usages_per_unit) {
      return showToast('Please fill in all required fields', 'error');
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('product_name', formData.product_name);
      // Preserve the existing description; fall back to the default if the
      // stored one is missing (e.g. products created before this change).
      fd.append(
        'description',
        editingProduct?.description?.trim()
          ? editingProduct.description
          : buildDefaultDescription(formData.product_name)
      );
      fd.append('unit', formData.unit);
      fd.append('unit_size', parseFloat(formData.unit_size));
      fd.append('estimated_usages_per_unit', parseFloat(formData.estimated_usages_per_unit));
      fd.append('is_active', formData.is_active ? 1 : 0);
      if (productImage) fd.append('product_image', productImage);
      else if (isImageRemoved && editingProduct?.product_image) fd.append('remove_image', 'true');

      const response = await api.post(`/products/update/${editingProduct.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(response.data.message || 'Product updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      const msg = error.response?.data?.message ||
        (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : 'Failed to update product. Please try again.');
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '', unit: '', unit_size: '',
      estimated_usages_per_unit: '', is_active: true,
    });
    setProductImage(null);
    setImagePreview(null);
    setIsImageRemoved(false);
    setEditingProduct(null);
    const fileInput = document.getElementById('product_image');
    if (fileInput) fileInput.value = '';
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name || '',
      unit: product.unit || '',
      unit_size: product.unit_size?.toString() || '',
      estimated_usages_per_unit: product.estimated_usages_per_unit?.toString() || '',
      is_active: product.is_active === 1 || product.is_active === true,
    });
    setImagePreview(product.product_image ? getImageUrl(product.product_image) : null);
    setProductImage(null);
    setIsImageRemoved(false);
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  useEffect(() => {
    let filtered = products;
    if (activeTab === 'active') filtered = filtered.filter(p => p.is_active === 1 || p.is_active === true);
    else if (activeTab === 'inactive') filtered = filtered.filter(p => p.is_active === 0 || p.is_active === false);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.product_name?.toLowerCase().includes(term) ||
        p.unit?.toLowerCase().includes(term)
      );
    }
    setFilteredProducts(filtered);
  }, [searchTerm, products, activeTab]);

  useEffect(() => { fetchProducts(); }, []);

  const getActiveCount = () => products.filter(p => p.is_active === 1 || p.is_active === true).length;
  const getInactiveCount = () => products.filter(p => p.is_active === 0 || p.is_active === false).length;

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading products...</p>
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
          label="Total Products"
          value={stats.totalProducts}
          sub="All products in catalog"
          icon={Package}
          color="from-pink-500 to-pink-600"
        />
        <StatCard
          label="Total Units"
          value={stats.totalUnits}
          sub="Sum of unit sizes"
          icon={Box}
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          label="Inactive Products"
          value={stats.inactiveProducts}
          sub="Hidden from inventory"
          icon={EyeOff}
          color="from-red-500 to-red-600"
          badge={stats.inactiveProducts > 0 ? 'Attention' : null}
          badgeClass="bg-red-50 text-red-600"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
        >
          <Plus size={14} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-slate-100 rounded-xl p-1">
        {[
          { key: 'all', label: `All Products (${products.length})`, icon: null },
          { key: 'active', label: `Active (${getActiveCount()})`, icon: CheckCircle },
          { key: 'inactive', label: `Inactive (${getInactiveCount()})`, icon: EyeOff },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === key
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {Icon && <Icon size={13} />}
            {label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 && !isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-8">
          <EmptyState
            icon={activeTab === 'inactive' ? EyeOff : Package}
            title={
              activeTab === 'inactive' ? 'No inactive products found'
                : activeTab === 'active' ? 'No active products found'
                  : 'No products found'
            }
            subtitle={
              searchTerm ? 'Try adjusting your search terms'
                : activeTab === 'inactive' ? 'All products are currently active'
                  : 'Click "Add Product" to create your first product'
            }
            action={
              !searchTerm && activeTab !== 'inactive' ? (
                <button
                  onClick={() => { resetForm(); setShowModal(true); }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-sm shadow-pink-500/30 hover:shadow-md transition-all text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Add Product</span>
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const imageUrl = getImageUrl(product.product_image);
            const isInactive = product.is_active === 0 || product.is_active === false;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(236,72,153,0.35)] transition-all duration-300 overflow-hidden group ${
                  isInactive ? 'border-slate-200/70 opacity-80' : 'border-slate-200/70'
                }`}
              >
                <div className={`relative h-28 p-3 ${isInactive ? 'bg-gradient-to-r from-slate-200 to-slate-300' : 'bg-gradient-to-r from-pink-500 to-fuchsia-600'}`}>
                  <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
                  <div className="relative flex items-center justify-between h-full">
                    {imageUrl ? (
                      <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm p-1 flex items-center justify-center overflow-hidden">
                        <img src={imageUrl} alt={product.product_name} className="w-full h-full object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Package size={22} className="text-white" />
                      </div>
                    )}
                    <div className="flex flex-col items-end gap-1">
                      <div className="rounded-full px-1.5 py-0.5">
                        <StatusPill status={isInactive ? 'inactive' : 'active'} label={isInactive ? 'Inactive' : 'Active'} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-3">
                    <h3 className={`text-sm font-semibold truncate ${isInactive ? 'text-slate-500' : 'text-slate-800'}`}>
                      {product.product_name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl bg-slate-50/60 border border-slate-100 p-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Box size={11} />
                        <span className="text-[10px] font-medium">Unit</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.unit || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50/60 border border-slate-100 p-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Ruler size={11} />
                        <span className="text-[10px] font-medium">Size</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{product.unit_size || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50/60 border border-slate-100 p-2 col-span-2">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Layers size={11} />
                        <span className="text-[10px] font-medium">Estimated Usages</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{product.estimated_usages_per_unit || 'N/A'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEdit(product)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-pink-600 bg-pink-50 border border-pink-100 rounded-xl hover:bg-pink-100 transition-colors"
                  >
                    <Edit size={12} />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden flex-shrink-0">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  {editingProduct ? <Edit size={18} className="text-white" /> : <Plus size={18} className="text-white" />}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
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
              onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
              className="p-6 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Product Name <span className="text-pink-500">*</span></label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Unit <span className="text-pink-500">*</span></label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="e.g., bottle, box, piece"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Unit Size <span className="text-pink-500">*</span></label>
                    <input
                      type="number"
                      name="unit_size"
                      value={formData.unit_size}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="e.g., 500, 1000"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Estimated Usages per Unit <span className="text-pink-500">*</span></label>
                    <input
                      type="number"
                      name="estimated_usages_per_unit"
                      value={formData.estimated_usages_per_unit}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="e.g., 10, 50"
                      step="1"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Status</label>
                    <div className="inline-flex bg-slate-100 rounded-xl p-1 mt-1">
                      {[
                        { val: true, label: 'Active' },
                        { val: false, label: 'Inactive' },
                      ].map(({ val, label }) => (
                        <button
                          type="button"
                          key={String(val)}
                          onClick={() => setFormData(prev => ({ ...prev, is_active: val }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            formData.is_active === val
                              ? 'bg-white text-pink-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Inactive products will not appear in the inventory</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Product Image</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-pink-300 rounded-xl bg-pink-50/60 cursor-pointer hover:bg-pink-50 hover:border-pink-400 transition-colors">
                    <ImageIcon size={16} className="text-pink-500" />
                    <span className="text-xs font-medium text-pink-600">
                      {productImage ? productImage.name : 'Click to upload image'}
                    </span>
                    <input
                      id="product_image"
                      type="file"
                      name="product_image"
                      onChange={handleImageChange}
                      accept="image/jpeg,image/png,image/jpg,image/gif"
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Remove image"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-3 relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-24 h-24 object-cover rounded-xl border border-slate-200"
                    />
                    {productImage && (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-2">Supported formats: JPEG, PNG, JPG, GIF (Max 2MB)</p>
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
                  disabled={isSubmitting}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {editingProduct ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>{editingProduct ? 'Update Product' : 'Add Product'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;