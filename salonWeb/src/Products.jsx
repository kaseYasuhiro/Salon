import { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit, Trash2, 
  X, AlertCircle, CheckCircle, Filter,
  Box, Ruler, PackageOpen, Layers, Image as ImageIcon,
  Eye, EyeOff
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/auth-context';

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
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'inactive' | 'all'
  
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    unit: '',
    unit_size: '',
    estimated_usages_per_unit: '',
    is_active: true
  });

  const [stats, setStats] = useState([
    { label: 'Total Products', value: '0', icon: Package, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { label: 'Total Units', value: '0', icon: Box, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { label: 'Inactive Products', value: '0', icon: EyeOff, bgColor: 'bg-red-50', textColor: 'text-red-600' },
  ]);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Sort products by created_at (most recent first) or by id
  const sortProductsByRecent = (productsArray) => {
    return [...productsArray].sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (a.id && b.id) {
        return b.id - a.id;
      }
      return 0;
    });
  };

  // Get full image URL
  const API_URL = import.meta.env.VITE_API_URL || "http://192.168.100.73:8000/api";
  const BASE_URL = API_URL.replace(/\/api\/?$/, "");
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage/')) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/storage/${imagePath}`;
  };

  // Fetch products
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/products');
      if (Array.isArray(response.data)) {
        const sortedProducts = sortProductsByRecent(response.data);
        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts);
        
        const totalProducts = sortedProducts.length;
        const totalUnits = sortedProducts.reduce((sum, p) => sum + (parseFloat(p.unit_size) || 0), 0);
        const inactiveProducts = sortedProducts.filter(p => p.is_active === 0 || p.is_active === false).length;
        
        setStats([
          { ...stats[0], value: totalProducts.toString() },
          { ...stats[1], value: totalUnits.toString() },
          { ...stats[2], value: inactiveProducts.toString() },
        ]);
      }
    } catch (error) {
      showToast('Failed to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProductImage(file);
      setIsImageRemoved(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImagePreview(null);
    setProductImage(null);
    setIsImageRemoved(true);
    const fileInput = document.getElementById('product_image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    if (!formData.product_name || !formData.unit || !formData.unit_size || !formData.estimated_usages_per_unit) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('product_name', formData.product_name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('unit', formData.unit);
      formDataToSend.append('unit_size', parseFloat(formData.unit_size));
      formDataToSend.append('estimated_usages_per_unit', parseFloat(formData.estimated_usages_per_unit));
      formDataToSend.append('is_active', formData.is_active ? 1 : 0);
      
      if (productImage) {
        formDataToSend.append('product_image', productImage);
      }
      
      const response = await api.post('/products/add', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showToast(response.data.message || 'Product added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        showToast(errors.join(', '), 'error');
      } else {
        showToast('Failed to add product. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    
    if (!formData.product_name || !formData.unit || !formData.unit_size || !formData.estimated_usages_per_unit) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('product_name', formData.product_name);
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('unit', formData.unit);
      formDataToSend.append('unit_size', parseFloat(formData.unit_size));
      formDataToSend.append('estimated_usages_per_unit', parseFloat(formData.estimated_usages_per_unit));
      formDataToSend.append('is_active', formData.is_active ? 1 : 0);
      
      if (productImage) {
        formDataToSend.append('product_image', productImage);
      } else if (isImageRemoved && editingProduct?.product_image) {
        formDataToSend.append('remove_image', 'true');
      }
      
      const response = await api.post(`/products/update/${editingProduct.id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showToast(response.data.message || 'Product updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      if (error.response?.data?.message) {
        showToast(error.response.data.message, 'error');
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        showToast(errors.join(', '), 'error');
      } else {
        showToast('Failed to update product. Please try again.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      product_name: '',
      description: '',
      unit: '',
      unit_size: '',
      estimated_usages_per_unit: '',
      is_active: true
    });
    setProductImage(null);
    setImagePreview(null);
    setIsImageRemoved(false);
    setEditingProduct(null);
    const fileInput = document.getElementById('product_image');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Handle edit click
  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name || '',
      description: product.description || '',
      unit: product.unit || '',
      unit_size: product.unit_size?.toString() || '',
      estimated_usages_per_unit: product.estimated_usages_per_unit?.toString() || '',
      is_active: product.is_active === 1 || product.is_active === true
    });
    if (product.product_image) {
      setImagePreview(getImageUrl(product.product_image));
    } else {
      setImagePreview(null);
    }
    setProductImage(null);
    setIsImageRemoved(false);
    setShowModal(true);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // Filter products based on tab and search
  useEffect(() => {
    let filtered = products;
    
    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(p => p.is_active === 1 || p.is_active === true);
    } else if (activeTab === 'inactive') {
      filtered = filtered.filter(p => p.is_active === 0 || p.is_active === false);
    }
    // 'all' shows everything
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.product_name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.unit?.toLowerCase().includes(term)
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, products, activeTab]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Get counts for tabs
  const getActiveCount = () => {
    return products.filter(p => p.is_active === 1 || p.is_active === true).length;
  };

  const getInactiveCount = () => {
    return products.filter(p => p.is_active === 0 || p.is_active === false).length;
  };

  // Loading skeleton
  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading products...</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Controls Bar - Search and Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        <button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          All Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'active'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <CheckCircle size={14} />
            Active ({getActiveCount()})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'inactive'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-1">
            <EyeOff size={14} />
            Inactive ({getInactiveCount()})
          </span>
        </button>
      </div>

      {/* Products Grid - Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const imageUrl = getImageUrl(product.product_image);
          const isInactive = product.is_active === 0 || product.is_active === false;
          
          return (
            <div 
              key={product.id} 
              className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border overflow-hidden group ${
                isInactive ? 'border-red-200 opacity-75' : 'border-gray-100'
              }`}
            >
              <div className="relative h-20 bg-gradient-to-r from-pink-50 to-purple-50 flex items-center justify-center">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                    isInactive ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-500 to-pink-600'
                  }`}>
                    <Package size={24} className="text-white" />
                  </div>
                )}
                {product.created_at && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    New
                  </div>
                )}
                {isInactive && (
                  <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Inactive
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="text-center mb-3">
                  <h3 className={`text-base font-semibold ${isInactive ? 'text-gray-500' : 'text-gray-800'}`}>
                    {product.product_name}
                  </h3>
                  {product.description && (
                    <p className={`text-xs mt-1 line-clamp-2 ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.description}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Box size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Unit</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{product.unit || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Ruler size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Size</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{product.unit_size || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center col-span-2">
                    <div className="flex items-center justify-center gap-1">
                      <Layers size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Estimated Usages</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{product.estimated_usages_per_unit || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Only Edit button - Delete removed */}
                <button 
                  onClick={() => handleEdit(product)}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-xs font-medium"
                >
                  <Edit size={12} />
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            {activeTab === 'inactive' ? (
              <EyeOff size={28} className="text-gray-400" />
            ) : (
              <Package size={28} className="text-gray-400" />
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            {activeTab === 'inactive' 
              ? 'No inactive products found' 
              : activeTab === 'active'
                ? 'No active products found'
                : 'No products found'}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : activeTab === 'inactive'
                ? 'All products are currently active'
                : 'Click "Add Product" to create your first product'}
          </p>
          {!searchTerm && activeTab !== 'inactive' && (
            <button 
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
            >
              <Plus size={14} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal - WIDER AND UNSCROLLABLE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
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

            <form 
              onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} 
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Unit *
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., bottle, box, piece"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Unit Size *
                    </label>
                    <input
                      type="number"
                      name="unit_size"
                      value={formData.unit_size}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., 500, 1000"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Estimated Usages per Unit *
                    </label>
                    <input
                      type="number"
                      name="estimated_usages_per_unit"
                      value={formData.estimated_usages_per_unit}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., 10, 50"
                      step="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="is_active"
                          value="true"
                          checked={formData.is_active === true}
                          onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                          className="w-4 h-4 text-pink-500 border-gray-300 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="is_active"
                          value="false"
                          checked={formData.is_active === false}
                          onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                          className="w-4 h-4 text-pink-500 border-gray-300 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">Inactive</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Inactive products will not appear in the inventory</p>
                  </div>
                </div>
              </div>

              {/* Description - Full Width */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  placeholder="Optional description"
                />
              </div>

              {/* Product Image Upload - Full Width */}
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Product Image
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="product_image"
                    type="file"
                    name="product_image"
                    onChange={handleImageChange}
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-pink-50 file:text-pink-600 file:text-sm file:font-medium hover:file:bg-pink-100"
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove image"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Product preview" 
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                      <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                        New
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Image preview</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPEG, PNG, JPG, GIF (Max 2MB)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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