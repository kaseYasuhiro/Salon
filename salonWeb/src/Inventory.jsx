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

  const [formData, setFormData] = useState({
    product_name: '',
    quantity: '',
    unit: '',
    reorder_level: '',
    unit_price: '',
    supplier: '',
    category: 'products',
    status: 'active'
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

  // Mock data for demonstration
  const mockInventory = [
    { id: 1, product_name: 'Hair Conditioner', quantity: 250, unit: 'ml', reorder_level: 100, status: 'In Stock', unit_price: 15.99, supplier: 'Beauty Supply Co.', category: 'products' },
    { id: 2, product_name: 'Shampoo', quantity: 180, unit: 'ml', reorder_level: 100, status: 'In Stock', unit_price: 12.99, supplier: 'Beauty Supply Co.', category: 'products' },
    { id: 3, product_name: 'Hair Color Kit', quantity: 45, unit: 'boxes', reorder_level: 50, status: 'Low Stock', unit_price: 45.00, supplier: 'ColorPro', category: 'products' },
    { id: 4, product_name: 'Nail Polish Set', quantity: 15, unit: 'bottles', reorder_level: 30, status: 'Critical', unit_price: 8.50, supplier: 'NailArt', category: 'products' },
    { id: 5, product_name: 'Hair Gel', quantity: 120, unit: 'g', reorder_level: 80, status: 'In Stock', unit_price: 9.99, supplier: 'StylingPro', category: 'products' },
    { id: 6, product_name: 'Scissors Set', quantity: 8, unit: 'pieces', reorder_level: 5, status: 'In Stock', unit_price: 89.99, supplier: 'SalonTools', category: 'tools' },
    { id: 7, product_name: 'Hair Dryer', quantity: 3, unit: 'units', reorder_level: 2, status: 'Low Stock', unit_price: 129.99, supplier: 'SalonTools', category: 'equipment' },
    { id: 8, product_name: 'Curling Iron', quantity: 5, unit: 'units', reorder_level: 3, status: 'In Stock', unit_price: 79.99, supplier: 'SalonTools', category: 'equipment' },
  ];

  // Fetch inventory from API
  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      // Replace with actual API call
      // const response = await api.get('/inventory');
      // setInventory(response.data);
      
      // Using mock data for now
      setTimeout(() => {
        setInventory(mockInventory);
        
        // Update stats
        const lowStock = mockInventory.filter(i => i.status === 'Low Stock').length;
        const criticalStock = mockInventory.filter(i => i.status === 'Critical').length;
        const totalValue = mockInventory.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
        
        stats[0].value = mockInventory.length.toString();
        stats[1].value = lowStock.toString();
        stats[2].value = criticalStock.toString();
        stats[3].value = `$${totalValue.toLocaleString()}`;
        
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching inventory:', error);
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

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    if (!formData.product_name || !formData.quantity || !formData.unit || !formData.reorder_level) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Replace with actual API call
      // await api.post('/inventory/add', formData);
      
      alert('Item added successfully!');
      setShowModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error adding item:', error);
      setFormError(error.response?.data?.message || 'Error adding item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    
    if (!formData.product_name || !formData.quantity || !formData.unit || !formData.reorder_level) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Replace with actual API call
      // await api.post(`/inventory/update/${editingItem.id}`, formData);
      
      alert('Item updated successfully!');
      setShowModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error updating item:', error);
      setFormError(error.response?.data?.message || 'Error updating item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        // Replace with actual API call
        // await api.post(`/inventory/delete/${id}`);
        
        alert('Item deleted successfully!');
        fetchInventory();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert(error.response?.data?.message || 'Error deleting item');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      quantity: '',
      unit: '',
      reorder_level: '',
      unit_price: '',
      supplier: '',
      category: 'products',
      status: 'active'
    });
    setEditingItem(null);
    setFormError('');
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      product_name: item.product_name,
      quantity: item.quantity,
      unit: item.unit,
      reorder_level: item.reorder_level,
      unit_price: item.unit_price,
      supplier: item.supplier,
      category: item.category,
      status: item.status
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

  const getStatusBadge = (status, quantity, reorderLevel) => {
    if (status === 'Critical' || quantity <= reorderLevel * 0.5) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={12} />
          Critical
        </span>
      );
    } else if (status === 'Low Stock' || quantity <= reorderLevel) {
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
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchTerm && !item.product_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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
          
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
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

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reorder Level</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit Price</th>
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
                      <span className="text-sm text-gray-600">{item.quantity}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.reorder_level}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status, item.quantity, item.reorder_level)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-800">${item.unit_price}</span>
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

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
              <div className="relative h-24 bg-gradient-to-r from-pink-50 to-purple-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package size={24} className="text-white" />
                  </div>
                  {getStatusBadge(item.status, item.quantity, item.reorder_level)}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.product_name}</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="text-sm font-semibold text-gray-800">{item.quantity} {item.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reorder Level</p>
                    <p className="text-sm font-semibold text-gray-800">{item.reorder_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unit Price</p>
                    <p className="text-sm font-semibold text-gray-800">${item.unit_price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Supplier</p>
                    <p className="text-sm text-gray-600 truncate">{item.supplier}</p>
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

      {/* Add/Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Product' : 'Add New Product'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Unit *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  >
                    <option value="">Select Unit</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="boxes">Boxes</option>
                    <option value="bottles">Bottles</option>
                    <option value="pieces">Pieces</option>
                    <option value="units">Units</option>
                  </select>
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
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                    value={formData.supplier}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="products">Products</option>
                  <option value="tools">Tools</option>
                  <option value="equipment">Equipment</option>
                </select>
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
                  {isLoading ? 'Saving...' : (editingItem ? 'Update Product' : 'Add Product')}
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
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No products found</h3>
          <p className="text-gray-500 text-sm mb-4">Click the "Add Product" button to add your first product</p>
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