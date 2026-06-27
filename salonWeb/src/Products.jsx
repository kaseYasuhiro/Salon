import { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit, Trash2, 
  X, AlertCircle, CheckCircle, Filter,
  Box, Ruler, PackageOpen, Layers
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
  
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    unit: '',
    unit_size: '',
    estimated_usages_per_unit: ''
  });

  const [stats, setStats] = useState([
    { label: 'Total Products', value: '0', icon: Package, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { label: 'Total Units', value: '0', icon: Box, bgColor: 'bg-green-50', textColor: 'text-green-600' },
  ]);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch products
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/products');
      console.log('Fetched products:', response.data);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        setFilteredProducts(response.data);
        
        // Calculate stats
        const totalProducts = response.data.length;
        const totalUnits = response.data.reduce((sum, p) => sum + (parseFloat(p.unit_size) || 0), 0);
        
        setStats([
          { ...stats[0], value: totalProducts.toString() },
          { ...stats[1], value: totalUnits.toString() },
        ]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Failed to fetch products', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.product_name || !formData.unit || !formData.unit_size || !formData.estimated_usages_per_unit) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/products/add', {
        product_name: formData.product_name,
        description: formData.description || '',
        unit: formData.unit,
        unit_size: parseFloat(formData.unit_size),
        estimated_usages_per_unit: parseFloat(formData.estimated_usages_per_unit)
      });
      
      console.log('Product added:', response.data);
      showToast(response.data.message || 'Product added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      
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
      const response = await api.post(`/products/update/${editingProduct.id}`, {
        product_name: formData.product_name,
        description: formData.description || '',
        unit: formData.unit,
        unit_size: parseFloat(formData.unit_size),
        estimated_usages_per_unit: parseFloat(formData.estimated_usages_per_unit)
      });
      
      console.log('Product updated:', response.data);
      showToast(response.data.message || 'Product updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      
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

  // Delete product
  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await api.post(`/products/delete/${id}`);
        console.log('Product deleted:', response.data);
        showToast(response.data.message || 'Product deleted successfully!', 'success');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        showToast(error.response?.data?.message || 'Failed to delete product', 'error');
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      product_name: '',
      description: '',
      unit: '',
      unit_size: '',
      estimated_usages_per_unit: ''
    });
    setEditingProduct(null);
  };

  // Handle edit click
  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name || '',
      description: product.description || '',
      unit: product.unit || '',
      unit_size: product.unit_size?.toString() || '',
      estimated_usages_per_unit: product.estimated_usages_per_unit?.toString() || ''
    });
    setShowModal(true);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Filter products
  useEffect(() => {
    let filtered = products;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.product_name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.unit?.toLowerCase().includes(term)
      );
    }
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-48"
            />
          </div>
        </div>
      </div>

      {/* Products Grid - Card View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group"
          >
            <div className="relative h-20 bg-gradient-to-r from-pink-50 to-purple-50 flex items-center justify-center">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package size={24} className="text-white" />
              </div>
            </div>
            
            <div className="p-4">
              <div className="text-center mb-3">
                <h3 className="text-base font-semibold text-gray-800">
                  {product.product_name}
                </h3>
                {product.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
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
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(product)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-xs font-medium"
                >
                  <Edit size={12} />
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteProduct(product.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No products found</h3>
          <p className="text-sm text-gray-500 mb-3">
            {searchTerm ? 'Try adjusting your search terms' : 'Click "Add Product" to create your first product'}
          </p>
          {!searchTerm && (
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

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0">
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

            <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="p-5 space-y-3">
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Unit *
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., bottle, box, piece"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Unit Size *
                </label>
                <input
                  type="number"
                  name="unit_size"
                  value={formData.unit_size}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., 500, 1000"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Estimated Usages per Unit *
                </label>
                <input
                  type="number"
                  name="estimated_usages_per_unit"
                  value={formData.estimated_usages_per_unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., 10, 50"
                  step="1"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editingProduct ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>{editingProduct ? 'Update' : 'Add'}</>
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