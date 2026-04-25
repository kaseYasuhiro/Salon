import { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit, Trash2, Filter,
  AlertCircle, CheckCircle, Clock, DollarSign,
  TrendingUp, TrendingDown, X, AlertTriangle
} from 'lucide-react';
import api from '../api/axios';

function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    unit: '',
    unit_size: '',
    estimated_usages_per_unit: '',
    product_quantity: '',
    current_usages: '',
    reorder_level: '',
    expiration_date: ''
  });

  const categories = [
    { id: 'all', name: 'All Products' },
    { id: 'products', name: 'Products' },
    { id: 'tools', name: 'Tools' },
    { id: 'equipment', name: 'Equipment' },
  ];

  const stats = [
    { label: 'Total Products', value: '0', icon: Package, color: 'bg-pink-100', textColor: 'text-pink-600' },
    { label: 'Low Stock', value: '0', icon: AlertCircle, color: 'bg-yellow-100', textColor: 'text-yellow-600' },
    { label: 'Critical Stock', value: '0', icon: AlertTriangle, color: 'bg-red-100', textColor: 'text-red-600' },
    { label: 'Total Value', value: '$0', icon: DollarSign, color: 'bg-green-100', textColor: 'text-green-600' },
  ];

  // Toast notification component
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch inventory from API
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/inventory');
      console.log('Fetched inventory:', response.data);
      
      if (Array.isArray(response.data)) {
        const transformedData = response.data.map(item => ({
          ...item,
          product_name: item.products?.product_name || 'N/A',
          description: item.products?.description || 'N/A',
          unit: item.products?.unit || 'N/A',
          unit_size: item.products?.unit_size || 'N/A',
          estimated_usages_per_unit: item.products?.estimated_usages_per_unit || 0
        }));
        
        setInventory(transformedData);
        
        const lowStockItems = transformedData.filter(item => {
          const remainingUsages = (item.product_quantity * item.estimated_usages_per_unit) - item.current_usages;
          return remainingUsages <= item.reorder_level && remainingUsages > item.reorder_level * 0.5;
        }).length;
        
        const criticalStockItems = transformedData.filter(item => {
          const remainingUsages = (item.product_quantity * item.estimated_usages_per_unit) - item.current_usages;
          return remainingUsages <= item.reorder_level * 0.5;
        }).length;
        
        const totalValue = transformedData.reduce((sum, item) => sum + ((item.product_quantity || 0) * (item.unit_price || 0)), 0);
        
        stats[0].value = transformedData.length.toString();
        stats[1].value = lowStockItems.toString();
        stats[2].value = criticalStockItems.toString();
        stats[3].value = `$${totalValue.toLocaleString()}`;
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showToast('Failed to fetch inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  // Add product to inventory
  const handleAddItem = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.product_name || !formData.description || !formData.unit || 
        !formData.unit_size || !formData.estimated_usages_per_unit || 
        !formData.product_quantity || !formData.current_usages || 
        !formData.reorder_level || !formData.expiration_date) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/inventory/add', {
        product_name: formData.product_name,
        description: formData.description,
        unit: formData.unit,
        unit_size: parseFloat(formData.unit_size),
        estimated_usages_per_unit: parseFloat(formData.estimated_usages_per_unit),
        product_quantity: parseInt(formData.product_quantity),
        current_usages: parseInt(formData.current_usages),
        reorder_level: parseInt(formData.reorder_level),
        expiration_date: formData.expiration_date
      });
      
      console.log('Product added:', response.data);
      showToast(response.data.message || 'Product added to inventory successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error adding product:', error);
      
      if (error.response?.data?.message) {
        setFormError(error.response.data.message);
        showToast(error.response.data.message, 'error');
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        setFormError(errors.join(', '));
        showToast(errors.join(', '), 'error');
      } else {
        setFormError('Error adding product to inventory. Please try again.');
        showToast('Error adding product to inventory', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    if (!formData.product_quantity && !formData.reorder_level) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Replace with actual API call for updating inventory item
      // await api.post(`/inventory/update/${editingItem.id}`, {
      //   product_quantity: formData.product_quantity,
      //   current_usages: formData.current_usages,
      //   reorder_level: formData.reorder_level,
      //   expiration_date: formData.expiration_date
      // });
      
      showToast('Stock updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error updating item:', error);
      setFormError(error.response?.data?.message || 'Error updating stock');
      showToast(error.response?.data?.message || 'Error updating stock', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        // Replace with actual API call for deleting inventory item
        // await api.post(`/inventory/delete/${id}`);
        
        showToast('Item deleted successfully!', 'success');
        fetchInventory();
      } catch (error) {
        console.error('Error deleting item:', error);
        showToast(error.response?.data?.message || 'Error deleting item', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      description: '',
      unit: '',
      unit_size: '',
      estimated_usages_per_unit: '',
      product_quantity: '',
      current_usages: '',
      reorder_level: '',
      expiration_date: ''
    });
    setEditingItem(null);
    setFormError('');
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      product_name: item.product_name || '',
      description: item.description || '',
      unit: item.unit || '',
      unit_size: item.unit_size || '',
      estimated_usages_per_unit: item.estimated_usages_per_unit || '',
      product_quantity: item.product_quantity || '',
      current_usages: item.current_usages || '',
      reorder_level: item.reorder_level || '',
      expiration_date: item.expiration_date || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    if (editingItem) {
      handleUpdateItem(e);
    } else {
      handleAddItem(e);
    }
  };

  const getStatusBadge = (item) => {
    const remainingUsages = (item.product_quantity * item.estimated_usages_per_unit) - item.current_usages;
    const reorderPoint = item.reorder_level;
    
    if (remainingUsages <= reorderPoint * 0.5) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={12} />
          Critical
        </span>
      );
    } else if (remainingUsages <= reorderPoint) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
          <Clock size={12} />
          Low Stock
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
          <CheckCircle size={12} />
          In Stock
        </span>
      );
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (searchTerm && !(item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading && inventory.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading inventory...</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100">
            <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={stat.textColor} size={22} />
            </div>
            <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'table' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Table View
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'cards' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cards View
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-48"
            />
          </div>
          
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Table View - Without Description */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Current Usages</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reorder Level</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Expiration Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-pink-50/30 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                          <Package size={18} className="text-pink-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.product_quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.current_usages}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.reorder_level}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.expiration_date}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit size={16} className="text-gray-500" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-gray-500">
              Showing {filteredInventory.length} of {inventory.length} products
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-sm hover:bg-pink-600 transition-colors">
                1
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards View - With Description */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
              <div className="relative h-24 bg-gradient-to-r from-pink-50 to-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package size={24} className="text-white" />
                  </div>
                  {getStatusBadge(item)}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.product_name}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="text-sm font-semibold text-gray-800">{item.product_quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Usages</p>
                    <p className="text-sm font-semibold text-gray-800">{item.current_usages}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reorder Level</p>
                    <p className="text-sm font-semibold text-gray-800">{item.reorder_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expiration Date</p>
                    <p className="text-sm text-gray-600">{item.expiration_date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unit</p>
                    <p className="text-sm text-gray-600">{item.unit} ({item.unit_size})</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-xl font-bold text-white">
                Add New Product to Inventory
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
              
              {/* Product Information Section */}
              <div className="border-b border-gray-200 pb-3 mb-2">
                <h3 className="text-md font-semibold text-gray-700">Product Information</h3>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Unit *
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="e.g., ml, g, pieces"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Unit Size *
                  </label>
                  <input
                    type="number"
                    name="unit_size"
                    value={formData.unit_size}
                    onChange={handleInputChange}
                    placeholder="e.g., 250, 500"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Estimated Usages Per Unit *
                </label>
                <input
                  type="number"
                  name="estimated_usages_per_unit"
                  value={formData.estimated_usages_per_unit}
                  onChange={handleInputChange}
                  placeholder="Number of usages per unit"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              {/* Inventory Information Section */}
              <div className="border-b border-gray-200 pb-3 mb-2 mt-4">
                <h3 className="text-md font-semibold text-gray-700">Inventory Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Product Quantity *
                  </label>
                  <input
                    type="number"
                    name="product_quantity"
                    value={formData.product_quantity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Current Usages *
                  </label>
                  <input
                    type="number"
                    name="current_usages"
                    value={formData.current_usages}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredInventory.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No inventory items found</h3>
          <p className="text-gray-500 text-sm mb-4">Click the "Add Product" button to add your first product to inventory</p>
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Inventory;