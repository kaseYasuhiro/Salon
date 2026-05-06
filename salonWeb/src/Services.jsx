import { useState, useEffect } from 'react';
import { 
  Scissors, Sparkles, Hand, Clock, DollarSign, 
  Edit, Eye, Plus, Search, Filter, Trash2,
  Star, Users, Calendar, Package, Activity, X, AlertCircle,
  ChevronDown, CheckCircle
} from 'lucide-react';
import api from '../api/axios';

function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [services, setServices] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceUsages, setSelectedServiceUsages] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [formError, setFormError] = useState('');
  const [usageFormError, setUsageFormError] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [usageFormData, setUsageFormData] = useState({
    service_id: '',
    product_id: '',
    product_name: '',
    estimated_usage: ''
  });

  const [formData, setFormData] = useState({
    service_name: '',
    description: '',
    price: '',
    duration_minutes: '',
    service_status: 'active'
  });

  const categories = [
    { id: 'all', name: 'All Services', icon: Scissors },
    { id: 'hair', name: 'Hair', icon: Scissors },
    { id: 'nails', name: 'Nails', icon: Hand },
    { id: 'spa', name: 'Spa', icon: Sparkles },
  ];

  const [stats, setStats] = useState([
    { label: 'Total Services', value: '0', icon: Scissors, bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
    { label: 'Active Services', value: '0', icon: Activity, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { label: 'Popular Services', value: '0', icon: Star, bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
    { label: 'Avg. Price', value: '$0', icon: DollarSign, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  ]);

  // Toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Fetch services from /service/usage route
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/service/usage');
      console.log('Fetched services:', response.data);
      
      if (Array.isArray(response.data)) {
        setServices(response.data);
        
        const activeServices = response.data.filter(s => s.service_status === 'active').length;
        const totalPrice = response.data.reduce((sum, s) => sum + parseFloat(s.price), 0);
        const avgPrice = response.data.length > 0 ? totalPrice / response.data.length : 0;
        
        setStats([
          { ...stats[0], value: response.data.length.toString() },
          { ...stats[1], value: activeServices.toString() },
          { ...stats[2], value: stats[2].value },
          { ...stats[3], value: `$${avgPrice.toFixed(0)}` },
        ]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all products from /products route
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      console.log('Fetched products:', response.data);
      if (Array.isArray(response.data)) {
        setAllProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch product usages for a specific service from /service/usage/{serviceId} route
  const fetchProductUsages = async (serviceId) => {
    setIsLoadingUsages(true);
    try {
      const response = await api.get(`/service/usage/${serviceId}`);
      console.log('Fetched product usages for service:', response.data);
      if (Array.isArray(response.data)) {
        setSelectedServiceUsages(response.data);
      } else {
        setSelectedServiceUsages([]);
      }
    } catch (error) {
      console.error('Error fetching product usages:', error);
      setSelectedServiceUsages([]);
    } finally {
      setIsLoadingUsages(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleUsageInputChange = (e) => {
    const { name, value } = e.target;
    setUsageFormData(prev => ({ ...prev, [name]: value }));
    setUsageFormError('');
  };

  // Handle product selection from dropdown
  const handleSelectProduct = (product) => {
    setUsageFormData({
      ...usageFormData,
      product_id: product.id,
      product_name: product.product_name
    });
    setProductSearchTerm(product.product_name);
    setShowProductDropdown(false);
  };

  // Filter products based on search term
  const filteredProducts = allProducts.filter(product =>
    product.product_name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // Get product name from service product usage
  const getProductNameFromUsage = (usage) => {
    if (usage.product && usage.product.product_name) {
      return usage.product.product_name;
    }
    if (usage.product_name) {
      return usage.product_name;
    }
    const foundProduct = allProducts.find(p => p.id === usage.product_id);
    if (foundProduct) {
      return foundProduct.product_name;
    }
    return `Product ID: ${usage.product_id}`;
  };

  // Get product unit from service product usage
  const getProductUnit = (usage) => {
    if (usage.product && usage.product.unit) {
      return usage.product.unit;
    }
    const foundProduct = allProducts.find(p => p.id === usage.product_id);
    if (foundProduct && foundProduct.unit) {
      return foundProduct.unit;
    }
    return '';
  };

  // Get product unit size from service product usage
  const getProductUnitSize = (usage) => {
    if (usage.product && usage.product.unit_size) {
      return usage.product.unit_size;
    }
    const foundProduct = allProducts.find(p => p.id === usage.product_id);
    if (foundProduct && foundProduct.unit_size) {
      return foundProduct.unit_size;
    }
    return '';
  };

  // Add product usage for service
  const handleAddProductUsage = async (e) => {
    e.preventDefault();
    
    if (!usageFormData.service_id || !usageFormData.product_id || !usageFormData.estimated_usage) {
      setUsageFormError('Please select a product and enter estimated usage');
      return;
    }

    setIsLoadingUsages(true);
    try {
      const response = await api.post('/service/usage/add', {
        service_id: parseInt(usageFormData.service_id),
        product_id: parseInt(usageFormData.product_id),
        estimated_usage: parseFloat(usageFormData.estimated_usage)
      });
      
      console.log('Product usage added:', response.data);
      showToast('Product usage added successfully!', 'success');
      setUsageFormData({
        service_id: selectedService?.id || '',
        product_id: '',
        product_name: '',
        estimated_usage: ''
      });
      setProductSearchTerm('');
      await fetchProductUsages(selectedService.id);
    } catch (error) {
      console.error('Error adding product usage:', error);
      setUsageFormError(error.response?.data?.message || 'Error adding product usage');
      showToast(error.response?.data?.message || 'Error adding product usage', 'error');
    } finally {
      setIsLoadingUsages(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    
    if (!formData.service_name || !formData.description || !formData.price || !formData.duration_minutes) {
      setFormError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/service/add', {
        service_name: formData.service_name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        service_status: formData.service_status
      });
      
      showToast('Service added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      setFormError(error.response?.data?.message || 'Error adding service');
      showToast(error.response?.data?.message || 'Error adding service', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    
    if (!formData.service_name || !formData.description || !formData.price || !formData.duration_minutes) {
      setFormError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/services/update/{id}', {
        id: editingService.id,
        service_name: formData.service_name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        service_status: formData.service_status
      });
      
      showToast('Service updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      setFormError(error.response?.data?.message || 'Error updating service');
      showToast(error.response?.data?.message || 'Error updating service', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await api.post('/services/delete/{id}', { id });
        showToast('Service deleted successfully!', 'success');
        fetchServices();
      } catch (error) {
        console.error('Error deleting service:', error);
        showToast(error.response?.data?.message || 'Error deleting service', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      description: '',
      price: '',
      duration_minutes: '',
      service_status: 'active'
    });
    setEditingService(null);
    setFormError('');
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      service_name: service.service_name,
      description: service.description,
      price: service.price,
      duration_minutes: service.duration_minutes,
      service_status: service.service_status
    });
    setShowModal(true);
  };

  const handleServiceClick = async (service) => {
    setSelectedService(service);
    setUsageFormData({
      service_id: service.id,
      product_id: '',
      product_name: '',
      estimated_usage: ''
    });
    setProductSearchTerm('');
    await fetchProductUsages(service.id);
    setShowUsageModal(true);
  };

  const handleSubmit = (e) => {
    if (editingService) {
      handleUpdateService(e);
    } else {
      handleAddService(e);
    }
  };

  const filteredServices = services.filter(service => {
    if (selectedCategory !== 'all') {
      const categoryMap = {
        hair: ['hair', 'cut', 'style', 'color', 'rebond', 'treatment'],
        nails: ['manicure', 'pedicure', 'nail'],
        spa: ['facial', 'wax', 'spa', 'massage']
      };
      const keywords = categoryMap[selectedCategory] || [];
      const matchesCategory = keywords.some(keyword => 
        service.service_name.toLowerCase().includes(keyword) ||
        (service.description && service.description.toLowerCase().includes(keyword))
      );
      if (!matchesCategory) return false;
    }
    if (searchTerm && !service.service_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading && services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading services...</p>
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
            <div className={`${stat.bgColor} w-12 h-12 rounded-xl flex items-center justify-center mb-3`}>
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
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'grid' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'list' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            List View
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search services..." 
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
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              selectedCategory === category.id
                ? 'bg-pink-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <category.icon size={16} />
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <div 
              key={service.id} 
              onClick={() => handleServiceClick(service)}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer group"
            >
              <div className="relative h-32 bg-gradient-to-r from-pink-50 to-purple-50 flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Scissors size={32} className="text-white" />
                </div>
                {service.service_status === 'inactive' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Inactive</span>
                  </div>
                )}
              </div>
              
              <div className="p-4">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">{service.service_name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1 text-green-600 font-bold">
                    <DollarSign size={16} />
                    <span>${parseFloat(service.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <Clock size={14} />
                    <span>{service.duration_minutes} min</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(service);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteService(service.id);
                    }}
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

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <table>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </table>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServices.map((service) => (
                  <tr 
                    key={service.id} 
                    onClick={() => handleServiceClick(service)}
                    className="hover:bg-pink-50/30 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                          <Scissors size={18} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{service.service_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">{service.description}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">{service.duration_minutes} min</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800">${parseFloat(service.price).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        service.service_status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {service.service_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(service);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit size={16} className="text-gray-500" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteService(service.id);
                          }}
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
        </div>
      )}

      {/* Service Details Modal */}
      {showUsageModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <h2 className="text-xl font-bold text-white">{selectedService.service_name}</h2>
              <button 
                onClick={() => {
                  setShowUsageModal(false);
                  setSelectedService(null);
                  setSelectedServiceUsages([]);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Service Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Service Details</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-gray-600"><span className="font-semibold">Description:</span> {selectedService.description}</p>
                  <p className="text-gray-600"><span className="font-semibold">Duration:</span> {selectedService.duration_minutes} minutes</p>
                  <p className="text-gray-600"><span className="font-semibold">Price:</span> ${parseFloat(selectedService.price).toFixed(2)}</p>
                  <p className="text-gray-600"><span className="font-semibold">Status:</span> 
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      selectedService.service_status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedService.service_status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Product Usage List with Unit beside Estimated Usage */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Product Usage</h3>
                  <span className="text-sm text-gray-500">{selectedServiceUsages.length} product(s) used</span>
                </div>
                
                {isLoadingUsages ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : selectedServiceUsages.length > 0 ? (
                  <div className="space-y-2">
                    {selectedServiceUsages.map((usage, index) => {
                      const productUnit = getProductUnit(usage);
                      const productUnitSize = getProductUnitSize(usage);
                      const unitDisplay = productUnit && productUnitSize ? `${productUnit}` : productUnit ? productUnit : '';
                      
                      return (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                              <Package size={16} className="text-pink-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {getProductNameFromUsage(usage)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Estimated Usage: {usage.estimated_usage} {unitDisplay} per service
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package size={32} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No products linked to this service yet</p>
                  </div>
                )}
              </div>

              {/* Add Product Usage Form */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Add Product Usage</h3>
                <form onSubmit={handleAddProductUsage} className="space-y-4">
                  {usageFormError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-500" />
                      <p className="text-red-600 text-sm">{usageFormError}</p>
                    </div>
                  )}

                  <input type="hidden" name="service_id" value={usageFormData.service_id} />
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Select Product *
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <Package size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={productSearchTerm}
                          onChange={(e) => {
                            setProductSearchTerm(e.target.value);
                            setShowProductDropdown(true);
                            setUsageFormData(prev => ({ ...prev, product_name: e.target.value, product_id: '' }));
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          placeholder="Search for a product..."
                          className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <ChevronDown 
                          size={18} 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                          onClick={() => setShowProductDropdown(!showProductDropdown)}
                        />
                      </div>
                      
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredProducts.map(product => (
                            <div
                              key={product.id}
                              onClick={() => handleSelectProduct(product)}
                              className="px-4 py-2 hover:bg-pink-50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-800">{product.product_name}</span>
                                <span className="text-xs text-gray-500">{product.unit_size}{product.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {showProductDropdown && filteredProducts.length === 0 && productSearchTerm && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                          <p className="text-gray-500 text-sm">No products found. Please add the product first in Inventory.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-2">
                      Estimated Usage *
                    </label>
                    <input
                      type="number"
                      name="estimated_usage"
                      value={usageFormData.estimated_usage}
                      onChange={handleUsageInputChange}
                      step="0.01"
                      placeholder="Amount used per service"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUsageModal(false);
                        setSelectedService(null);
                        setSelectedServiceUsages([]);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingUsages}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium disabled:opacity-50"
                    >
                      {isLoadingUsages ? 'Adding...' : 'Add Product Usage'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingService ? 'Edit Service' : 'Add New Service'}
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
                  Service Name *
                </label>
                <input
                  type="text"
                  name="service_name"
                  value={formData.service_name}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    step="15"
                    min="15"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Status
                </label>
                <select
                  name="service_status"
                  value={formData.service_status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                  {isLoading ? 'Saving...' : (editingService ? 'Update Service' : 'Add Service')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredServices.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scissors size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No services found</h3>
          <p className="text-gray-500 text-sm mb-4">Click the "Add Service" button to create your first service</p>
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            <Plus size={16} />
            <span>Add Service</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Services;