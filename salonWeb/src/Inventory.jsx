import { useState, useEffect } from 'react';
import { 
  Package, Search, Plus, Edit, Trash2, Filter,
  AlertCircle, CheckCircle, Clock, DollarSign,
  TrendingUp, TrendingDown, X, AlertTriangle, Calendar,
  Eye, History
} from 'lucide-react';
import api from '../api/axios';

function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockPrice, setRestockPrice] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    product_quantity: '',
    current_usages: '',
    reorder_level: '',
    expiration_date: '',
    unit_price: ''
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
    { label: 'Total Value', value: '₱0', icon: () => <span className="text-green-600 text-lg font-bold">₱</span>, color: 'bg-green-100', textColor: 'text-green-600' },
  ];

  // Toast notification component
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Get current user from localStorage
  const getCurrentUser = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  };

  // Check if product is expired
  const isExpired = (expirationDate) => {
    if (!expirationDate) return false;
    const today = new Date();
    const expDate = new Date(expirationDate);
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    return expDate <= today;
  };

  // Sort inventory by created_at (most recent first) or by id
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

  // Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('Fetched products:', response.data);
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        setFilteredProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
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
        
        const sortedData = sortInventoryByRecent(transformedData);
        setInventory(sortedData);
        
        const lowStockItems = sortedData.filter(item => {
          const remainingUsages = (item.product_quantity * item.estimated_usages_per_unit) - item.current_usages;
          return remainingUsages <= item.reorder_level && remainingUsages > item.reorder_level * 0.5;
        }).length;
        
        const totalValue = sortedData.reduce((sum, item) => sum + ((item.product_quantity || 0) * (item.unit_price || 0)), 0);
        
        stats[0].value = sortedData.length.toString();
        stats[1].value = lowStockItems.toString();
        stats[2].value = `₱${totalValue.toLocaleString()}`;
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
      }
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      showToast('Failed to fetch transactions', 'error');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchInventoryTransactions();
    setUser(getCurrentUser());
  }, []);

  // Filter products for dropdown
  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(p => 
        p.product_name.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  // Filter out products that are already in inventory
  const getAvailableProducts = () => {
    const inventoryProductIds = inventory.map(item => item.product_id);
    return filteredProducts.filter(product => !inventoryProductIds.includes(product.id));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  // Handle product selection from dropdown
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
      unit_price: ''
    }));
    setProductSearch(product.product_name);
    setShowProductDropdown(false);
  };

  // Add stock to inventory with expense tracking
  const handleAddStock = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id) {
      setFormError('Please select a product');
      return;
    }
    
    if (!formData.product_quantity || parseInt(formData.product_quantity) <= 0) {
      setFormError('Please enter a valid quantity');
      return;
    }

    if (!formData.current_usages || parseInt(formData.current_usages) < 0) {
      setFormError('Please enter valid current usages');
      return;
    }

    if (!formData.reorder_level || parseInt(formData.reorder_level) < 0) {
      setFormError('Please enter a valid reorder level');
      return;
    }

    if (!formData.expiration_date) {
      setFormError('Please select an expiration date');
      return;
    }

    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      setFormError('Please enter a valid unit price');
      return;
    }

    // Check if product already exists in inventory
    const existingItem = inventory.find(item => item.product_id === parseInt(formData.product_id));
    if (existingItem) {
      setFormError('This product already exists in inventory. Please use the Restock function to update stock.');
      return;
    }

    setIsLoading(true);
    try {
      // Add to inventory
      const response = await api.post('/inventory/add', {
        product_id: parseInt(formData.product_id),
        product_quantity: parseInt(formData.product_quantity),
        current_usages: parseInt(formData.current_usages),
        reorder_level: parseInt(formData.reorder_level),
        expiration_date: formData.expiration_date,
        unit_price: parseFloat(formData.unit_price)
      });
      
      console.log('Stock added:', response.data);

      // Now, create an expense entry for the new stock
      const totalAmount = parseFloat(formData.unit_price) * parseInt(formData.product_quantity);
      const currentUser = getCurrentUser();
      const recordedBy = currentUser?.id || 1;

      const expenseData = {
        expense_name: `New Stock: ${selectedProduct?.product_name || formData.product_name}`,
        amount: totalAmount,
        expense_date: new Date().toISOString().split('T')[0],
        description: `restock`,
        recorded_by: recordedBy
      };

      console.log('Creating expense entry:', expenseData);

      try {
        const expenseResponse = await api.post('/expenses/add', expenseData);
        console.log('Expense created:', expenseResponse.data);
        showToast(`Stock added and expense recorded! (₱${totalAmount.toFixed(2)})`, 'success');
      } catch (expenseError) {
        console.error('Error creating expense:', expenseError);
        console.error('Error response data:', expenseError.response?.data);
        console.error('Error response status:', expenseError.response?.status);
        
        if (expenseError.response?.data?.errors) {
          const errors = Object.values(expenseError.response.data.errors).flat();
          showToast(`Stock added but expense recording failed: ${errors.join(', ')}`, 'warning');
        } else {
          showToast(`Stock added but expense recording failed: ${expenseError.response?.data?.message || 'Unknown error'}`, 'warning');
        }
      }
      
      setShowAddStockModal(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error adding stock:', error);
      
      if (error.response?.data?.message) {
        setFormError(error.response.data.message);
        showToast(error.response.data.message, 'error');
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).flat();
        setFormError(errors.join(', '));
        showToast(errors.join(', '), 'error');
      } else {
        setFormError('Error adding stock. Please try again.');
        showToast('Error adding stock', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update stock (restock existing product) with expense tracking
  const handleRestock = async (e) => {
    e.preventDefault();
    
    if (!restockQuantity || parseInt(restockQuantity) <= 0) {
      setFormError('Please enter a valid quantity');
      return;
    }

    if (!restockPrice || parseFloat(restockPrice) <= 0) {
      setFormError('Please enter a valid price per unit');
      return;
    }

    setIsLoading(true);
    try {
      // First, update the inventory
      const restockResponse = await api.post(`/inventory/update/${editingItem.id}`, {
        product_id: parseInt(editingItem.product_id),
        product_quantity: parseInt(restockQuantity)
      });
      
      console.log('Stock restocked:', restockResponse.data);

      // Now, create an expense entry for the restock
      const totalAmount = parseFloat(restockPrice) * parseInt(restockQuantity);
      const currentUser = getCurrentUser();
      const recordedBy = currentUser?.id || 1;

      const expenseData = {
        expense_name: `Restock: ${editingItem.product_name}`,
        amount: totalAmount,
        expense_date: new Date().toISOString().split('T')[0],
        description: 'restock',
        recorded_by: recordedBy
      };

      console.log('Creating expense entry:', expenseData);

      try {
        const expenseResponse = await api.post('/expenses/add', expenseData);
        console.log('Expense created:', expenseResponse.data);
        showToast(`Stock restocked and expense recorded! (₱${totalAmount.toFixed(2)})`, 'success');
      } catch (expenseError) {
        console.error('Error creating expense:', expenseError);
        console.error('Error response data:', expenseError.response?.data);
        console.error('Error response status:', expenseError.response?.status);
        
        if (expenseError.response?.data?.errors) {
          const errors = Object.values(expenseError.response.data.errors).flat();
          showToast(`Stock restocked but expense recording failed: ${errors.join(', ')}`, 'warning');
        } else {
          showToast(`Stock restocked but expense recording failed: ${expenseError.response?.data?.message || 'Unknown error'}`, 'warning');
        }
      }
      
      setShowRestockModal(false);
      setEditingItem(null);
      setRestockQuantity('');
      setRestockPrice('');
      fetchInventory();
      fetchInventoryTransactions();
    } catch (error) {
      console.error('Error restocking:', error);
      setFormError(error.response?.data?.message || 'Error restocking');
      showToast(error.response?.data?.message || 'Error restocking', 'error');
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
      product_id: '',
      product_name: '',
      product_quantity: '',
      current_usages: '',
      reorder_level: '',
      expiration_date: '',
      unit_price: ''
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

  const handleOpenTransactionsModal = (item) => {
    setSelectedInventoryItem(item);
    setShowTransactionsModal(true);
  };

  const getStatusBadge = (item) => {
    const remainingUsages = (item.product_quantity * item.estimated_usages_per_unit) - item.current_usages;
    const reorderPoint = item.reorder_level;
    
    if (remainingUsages <= reorderPoint * 0.5) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700">
          <AlertTriangle size={10} />
          Critical
        </span>
      );
    } else if (remainingUsages <= reorderPoint) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-yellow-100 text-yellow-700">
          <Clock size={10} />
          Low Stock
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700">
          <CheckCircle size={10} />
          In Stock
        </span>
      );
    }
  };

  const getTransactionTypeBadge = (type) => {
    switch(type) {
      case 'usage':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700">
            <AlertCircle size={10} />
            Usage
          </span>
        );
      case 'restock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700">
            <Package size={10} />
            Restock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-700">
            {type}
          </span>
        );
    }
  };

  // Filter inventory (maintains sort order)
  const filteredInventory = inventory.filter(item => {
    if (searchTerm && !(item.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Get transactions for the selected inventory item
  const getItemTransactions = () => {
    if (!selectedInventoryItem) return [];
    return transactions.filter(t => t.inventory_id === selectedInventoryItem.id);
  };

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
            toast.type === 'success' ? 'bg-green-500' : 
            toast.type === 'warning' ? 'bg-yellow-500' :
            'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : toast.type === 'warning' ? (
              <AlertTriangle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Stats Grid - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-100">
            <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-2`}>
              {typeof stat.icon === 'function' ? stat.icon() : <stat.icon className={stat.textColor} size={18} />}
            </div>
            <p className="text-gray-500 text-xs mb-0.5">{stat.label}</p>
            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls Bar - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'table' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Table View
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'cards' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cards View
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
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-44"
            />
          </div>
          
          <button 
            onClick={() => {
              resetForm();
              setShowAddStockModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
          >
            <Plus size={14} />
            <span>Add Stock</span>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usage Left</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reorder Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-pink-50/30 transition-colors duration-200">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-100 to-pink-200 rounded-lg flex items-center justify-center">
                          <Package size={14} className="text-pink-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.product_quantity}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.current_usages}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{item.reorder_level}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => handleOpenTransactionsModal(item)}
                          className="p-1 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Transactions"
                        >
                          <History size={14} className="text-blue-600" />
                        </button>
                        <button 
                          onClick={() => handleOpenRestockModal(item)}
                          className="p-1 hover:bg-green-50 rounded-lg transition-colors"
                          title="Restock"
                        >
                          <Package size={14} className="text-green-600" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination - Compact */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-500">
              Showing {filteredInventory.length} of {inventory.length} products
            </p>
            <div className="flex gap-1.5">
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50" disabled>
                Prev
              </button>
              <button className="px-2 py-1 text-xs bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
                1
              </button>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInventory.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
              <div className="relative h-20 bg-gradient-to-r from-pink-50 to-purple-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Package size={20} className="text-white" />
                  </div>
                  <div className="flex gap-1">
                    {getStatusBadge(item)}
                  </div>
                </div>
              </div>
              
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-1 truncate">{item.product_name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400">Quantity</p>
                    <p className="text-xs font-semibold text-gray-800">{item.product_quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Usage Left</p>
                    <p className="text-xs font-semibold text-gray-800">{item.current_usages}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Reorder Level</p>
                    <p className="text-xs font-semibold text-gray-800">{item.reorder_level}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Unit</p>
                    <p className="text-xs text-gray-600">{item.unit} ({item.unit_size})</p>
                  </div>
                </div>
                
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleOpenTransactionsModal(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                  >
                    <History size={12} />
                    History
                  </button>
                  <button 
                    onClick={() => handleOpenRestockModal(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium"
                  >
                    <Package size={12} />
                    Restock
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stock Modal - WIDER AND UNSCROLLABLE */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Add New Stock</h2>
              <button 
                onClick={() => {
                  setShowAddStockModal(false);
                  resetForm();
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Product Search */}
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Search Product *
                    </label>
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
                              ...prev,
                              product_id: '',
                              product_name: '',
                              product_quantity: '',
                              current_usages: '',
                              reorder_level: '',
                              expiration_date: '',
                              unit_price: ''
                            }));
                          }
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="Search for a product..."
                        required
                      />
                      {showProductDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {getAvailableProducts().length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              {filteredProducts.length === 0 ? 'No products found' : 'All products already have stock'}
                            </div>
                          ) : (
                            getAvailableProducts().map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductSelect(product)}
                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-pink-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-800">{product.product_name}</div>
                                <div className="text-xs text-gray-500">
                                  {product.unit} ({product.unit_size}) - {product.estimated_usages_per_unit} usages
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Product Info */}
                  {selectedProduct && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Selected Product</p>
                          <p className="text-sm font-semibold text-gray-800">{selectedProduct.product_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unit</p>
                          <p className="text-sm font-semibold text-gray-800">{selectedProduct.unit} ({selectedProduct.unit_size})</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="product_quantity"
                      value={formData.product_quantity}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter quantity"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Current Usages *
                    </label>
                    <input
                      type="number"
                      name="current_usages"
                      value={formData.current_usages}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Current usages"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Reorder Level *
                    </label>
                    <input
                      type="number"
                      name="reorder_level"
                      value={formData.reorder_level}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Reorder level"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Section - Full Width */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Unit Price (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-sm">₱</span>
                    <input
                      type="number"
                      name="unit_price"
                      value={formData.unit_price}
                      onChange={handleInputChange}
                      className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Price per unit of this product</p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    name="expiration_date"
                    value={formData.expiration_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              {formData.product_quantity && formData.unit_price && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Value:</span>
                    <span className="text-xl font-bold text-blue-700">
                      ₱{(parseFloat(formData.unit_price) * parseInt(formData.product_quantity)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be recorded as an expense
                  </p>
                </div>
              )}

              {/* Note Box */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-700 font-semibold">Note:</p>
                    <p className="text-sm text-yellow-600">
                      Adding new stock will automatically create an expense entry with the total value.
                      The expense will be recorded under "{selectedProduct?.product_name || 'New Product'}".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStockModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Stock & Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal - PINK COLOR */}
      {showRestockModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Restock Product</h2>
              <button 
                onClick={() => {
                  setShowRestockModal(false);
                  setEditingItem(null);
                  setRestockQuantity('');
                  setRestockPrice('');
                  setFormError('');
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRestock} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
              
              {/* Product Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Product</p>
                    <p className="text-sm font-semibold text-gray-800">{editingItem.product_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unit</p>
                    <p className="text-sm font-semibold text-gray-800">{editingItem.unit} ({editingItem.unit_size})</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Quantity</p>
                    <p className="text-sm font-semibold text-gray-800">{editingItem.product_quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reorder Level</p>
                    <p className="text-sm font-semibold text-gray-800">{editingItem.reorder_level}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter quantity to add"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">This will be added to the current stock</p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Price per Unit (₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold text-sm">₱</span>
                  <input
                    type="number"
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">This will be recorded as an expense</p>
              </div>

              {/* Total Cost Preview */}
              {restockQuantity && restockPrice && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Cost:</span>
                    <span className="text-xl font-bold text-blue-700">
                      ₱{(parseFloat(restockPrice) * parseInt(restockQuantity)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be added to expenses as "Restock: {editingItem.product_name}"
                  </p>
                </div>
              )}

              {/* Note Box */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-700 font-semibold">Note:</p>
                    <p className="text-sm text-yellow-600">
                      Restocking this product will automatically create an expense entry with the total amount.
                      The expense will be recorded under "{editingItem.product_name}" with description "restock".
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false);
                    setEditingItem(null);
                    setRestockQuantity('');
                    setRestockPrice('');
                    setFormError('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : 'Restock & Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Modal - PINK COLOR */}
      {showTransactionsModal && selectedInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[85vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-white">Transaction History</h2>
                <p className="text-pink-100 text-sm mt-0.5">{selectedInventoryItem.product_name}</p>
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

            <div className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ maxHeight: 'calc(85vh - 72px)' }}>
              {/* Product Info Summary */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Current Quantity</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedInventoryItem.product_quantity}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Usage Left</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedInventoryItem.current_usages}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Reorder Level</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedInventoryItem.reorder_level}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-[10px] text-gray-400">Unit</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedInventoryItem.unit}</p>
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
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Appointment ID</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getItemTransactions().length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-gray-500 text-sm">
                            No transactions found for this product
                          </td>
                        </tr>
                      ) : (
                        getItemTransactions().map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {getTransactionTypeBadge(transaction.transaction_type)}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={`text-sm font-semibold ${
                                transaction.quantity_change < 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {transaction.quantity_change}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                              #{transaction.transaction_id}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                              #{transaction.transaction?.appointment_id || 'N/A'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-600">
                              {new Date(transaction.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
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

      {/* Empty State - Smaller */}
      {filteredInventory.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No inventory items found</h3>
          <p className="text-sm text-gray-500 mb-3">Click "Add Stock" to add your first product</p>
          <button 
            onClick={() => {
              resetForm();
              setShowAddStockModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
          >
            <Plus size={14} />
            <span>Add Stock</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Inventory;