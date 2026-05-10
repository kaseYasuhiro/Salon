import { useState, useEffect } from 'react';
import { 
  Scissors, Sparkles, Hand, Clock, DollarSign, 
  Edit, Eye, Plus, Search, Filter, Trash2,
  Star, Users, Calendar, Package, Activity, X, AlertCircle,
  ChevronDown, CheckCircle, Tag
} from 'lucide-react';
import api from '../api/axios';

function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [services, setServices] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
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
  const [isAddingSpecialty, setIsAddingSpecialty] = useState(false);
  const [specialtyError, setSpecialtyError] = useState('');

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
    service_status: 'active',
    is_multitaskable: false
  });

  const [serviceSpecialtyFormData, setServiceSpecialtyFormData] = useState({
    service_id: '',
    specialty_id: ''
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

  // Fetch services with their specialties
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const servicesResponse = await api.get('/services');
      console.log('Fetched services:', servicesResponse.data);
      
      const specialtiesResponse = await api.get('/services/specialties');
      console.log('Fetched service specialties:', specialtiesResponse.data);
      
      const specialtiesMap = new Map();
      if (Array.isArray(specialtiesResponse.data)) {
        specialtiesResponse.data.forEach(item => {
          const serviceId = item.service_id;
          if (!specialtiesMap.has(serviceId)) {
            specialtiesMap.set(serviceId, []);
          }
          specialtiesMap.get(serviceId).push({
            id: item.id,
            specialty_id: item.specialty_id,
            specialty: item.specialties
          });
        });
      }
      
      let servicesWithSpecialties = [];
      if (Array.isArray(servicesResponse.data)) {
        servicesWithSpecialties = servicesResponse.data.map(service => ({
          ...service,
          service_specialties: specialtiesMap.get(service.id) || []
        }));
      }
      
      console.log('Services with merged specialties:', servicesWithSpecialties);
      setServices(servicesWithSpecialties);
      
      const activeServices = servicesWithSpecialties.filter(s => s.service_status === 'active').length;
      const totalPrice = servicesWithSpecialties.reduce((sum, s) => sum + parseFloat(s.price), 0);
      const avgPrice = servicesWithSpecialties.length > 0 ? totalPrice / servicesWithSpecialties.length : 0;
      
      setStats([
        { ...stats[0], value: servicesWithSpecialties.length.toString() },
        { ...stats[1], value: activeServices.toString() },
        { ...stats[2], value: stats[2].value },
        { ...stats[3], value: `$${avgPrice.toFixed(0)}` },
      ]);
      
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

  // Fetch all specialties from the specialties table
  const fetchSpecialtiesList = async () => {
    try {
      const response = await api.get('/specialties');
      console.log('Available specialties:', response.data);
      if (Array.isArray(response.data)) {
        setSpecialtiesList(response.data);
      }
    } catch (error) {
      console.error('Error fetching specialties list:', error);
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
    fetchSpecialtiesList();
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

  const handleServiceSpecialtyChange = (e) => {
    const { name, value } = e.target;
    setServiceSpecialtyFormData(prev => ({ ...prev, [name]: value }));
    setSpecialtyError('');
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

  // Add service specialty
  const handleAddServiceSpecialty = async (e) => {
    e.preventDefault();
    
    if (!serviceSpecialtyFormData.specialty_id) {
      setSpecialtyError('Please select a specialty');
      return;
    }

    setIsAddingSpecialty(true);
    try {
      await api.post('/services/specialty/add', {
        service_id: parseInt(serviceSpecialtyFormData.service_id),
        specialty_id: parseInt(serviceSpecialtyFormData.specialty_id)
      });
      
      showToast('Specialty added to service successfully!', 'success');
      setServiceSpecialtyFormData({
        service_id: selectedService?.id || '',
        specialty_id: ''
      });
      await fetchServices();
      if (selectedService) {
        await fetchProductUsages(selectedService.id);
      }
    } catch (error) {
      console.error('Error adding service specialty:', error);
      setSpecialtyError(error.response?.data?.message || 'Error adding specialty');
      showToast(error.response?.data?.message || 'Error adding specialty', 'error');
    } finally {
      setIsAddingSpecialty(false);
    }
  };

  // Format specialty name for display
  const formatSpecialtyName = (specialtyName) => {
    if (!specialtyName) return '';
    return specialtyName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get specialty icon
  const getSpecialtyIcon = (specialtyName) => {
    const name = specialtyName?.toLowerCase();
    if (name === 'stylist') return <Scissors size={10} />;
    if (name === 'barber') return <Scissors size={10} />;
    if (name === 'nail_technician') return <Hand size={10} />;
    if (name === 'massage_therapist') return <Activity size={10} />;
    if (name === 'makeup_artist') return <Star size={10} />;
    if (name === 'esthetician') return <Sparkles size={10} />;
    return <Star size={10} />;
  };

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
        service_status: formData.service_status,
        is_multitaskable: formData.is_multitaskable
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
        service_status: formData.service_status,
        is_multitaskable: formData.is_multitaskable
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
      service_status: 'active',
      is_multitaskable: false
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
      service_status: service.service_status,
      is_multitaskable: service.is_multitaskable || false
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
    setServiceSpecialtyFormData({
      service_id: service.id,
      specialty_id: ''
    });
    setProductSearchTerm('');
    setSpecialtyError('');
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

      {/* Stats Grid - Smaller */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Controls Bar - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'grid' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'list' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            List View
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search services..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm w-44"
            />
          </div>
          
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium"
          >
            <Plus size={14} />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Categories Tabs - Compact */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm ${
              selectedCategory === category.id
                ? 'bg-pink-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <category.icon size={14} />
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Grid View - Smaller Cards */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => (
            <div 
              key={service.id} 
              onClick={() => handleServiceClick(service)}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer group"
            >
              <div className="relative h-24 bg-gradient-to-r from-pink-50 to-purple-50 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Scissors size={24} className="text-white" />
                </div>
                {service.service_status === 'inactive' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Inactive</span>
                  </div>
                )}
                {service.service_specialties && service.service_specialties.length > 0 && (
                  <div className="absolute bottom-1.5 right-1.5 bg-white rounded-full px-1.5 py-0.5 shadow-md">
                    <div className="flex items-center gap-0.5">
                      <Tag size={10} className="text-pink-500" />
                      <span className="text-[10px] font-medium text-gray-700">
                        {service.service_specialties.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{service.service_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
                </div>
                
                <div className="mb-2 min-h-[32px]">
                  {service.service_specialties && service.service_specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {service.service_specialties.slice(0, 2).map((specialtyItem, idx) => {
                        const specialtyName = specialtyItem.specialty?.specialty_name;
                        return specialtyName ? (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium"
                          >
                            {getSpecialtyIcon(specialtyName)}
                            <span>{formatSpecialtyName(specialtyName)}</span>
                          </span>
                        ) : null;
                      })}
                      {service.service_specialties.length > 2 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                          +{service.service_specialties.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No specialties</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-0.5 text-green-600 font-bold">
                    <DollarSign size={12} />
                    <span className="text-sm">${parseFloat(service.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-gray-500 text-xs">
                    <Clock size={10} />
                    <span>{service.duration_minutes} min</span>
                  </div>
                </div>
                
                <div className="flex gap-1.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(service);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-xs font-medium"
                  >
                    <Edit size={12} />
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteService(service.id);
                    }}
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

      {/* List View - Compact */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Specialties</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredServices.map((service) => (
                  <tr 
                    key={service.id} 
                    onClick={() => handleServiceClick(service)}
                    className="hover:bg-pink-50/30 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Scissors size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{service.service_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 max-w-xs truncate">{service.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {service.service_specialties && service.service_specialties.length > 0 ? (
                          service.service_specialties.slice(0, 2).map((specialtyItem, idx) => {
                            const specialtyName = specialtyItem.specialty?.specialty_name;
                            return specialtyName ? (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium"
                              >
                                {getSpecialtyIcon(specialtyName)}
                                <span>{formatSpecialtyName(specialtyName)}</span>
                              </span>
                            ) : null;
                          })
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-gray-400" />
                        <span className="text-xs text-gray-600">{service.duration_minutes} min</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-0.5">
                        <DollarSign size={10} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-800">${parseFloat(service.price).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                        service.service_status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {service.service_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(service);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit size={14} className="text-gray-500" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteService(service.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
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
        </div>
      )}

      {/* Service Details Modal - Same as before but keep compact design */}
      {showUsageModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between sticky top-0">
              <h2 className="text-lg font-bold text-white">{selectedService.service_name}</h2>
              <button 
                onClick={() => {
                  setShowUsageModal(false);
                  setSelectedService(null);
                  setSelectedServiceUsages([]);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {/* Service Details */}
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Service Details</h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs text-gray-600"><span className="font-semibold">Description:</span> {selectedService.description}</p>
                  <p className="text-xs text-gray-600"><span className="font-semibold">Duration:</span> {selectedService.duration_minutes} minutes</p>
                  <p className="text-xs text-gray-600"><span className="font-semibold">Price:</span> ${parseFloat(selectedService.price).toFixed(2)}</p>
                  <p className="text-xs text-gray-600"><span className="font-semibold">Status:</span> 
                    <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                      selectedService.service_status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedService.service_status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-600"><span className="font-semibold">Multi-taskable:</span> 
                    <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                      selectedService.is_multitaskable 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedService.is_multitaskable ? 'Yes' : 'No'}
                    </span>
                  </p>
                  
                  {selectedService.service_specialties && selectedService.service_specialties.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600"><span className="font-semibold">Specialties:</span></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedService.service_specialties.map((specialtyItem, idx) => {
                          const specialtyName = specialtyItem.specialty?.specialty_name;
                          return specialtyName ? (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[10px] font-medium"
                            >
                              {getSpecialtyIcon(specialtyName)}
                              <span>{formatSpecialtyName(specialtyName)}</span>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Service Specialty Form - Compact */}
              <div className="border-t border-gray-200 pt-4 mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Add Service Specialty</h3>
                <form onSubmit={handleAddServiceSpecialty} className="space-y-3">
                  {specialtyError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-red-500" />
                      <p className="text-red-600 text-xs">{specialtyError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Select Specialty *
                    </label>
                    <select
                      name="specialty_id"
                      value={serviceSpecialtyFormData.specialty_id}
                      onChange={handleServiceSpecialtyChange}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    >
                      <option value="">Select a specialty...</option>
                      {specialtiesList.map((specialty) => (
                        <option key={specialty.id} value={specialty.id}>
                          {formatSpecialtyName(specialty.specialty_name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingSpecialty}
                    className="w-full px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                  >
                    {isAddingSpecialty ? 'Adding...' : 'Add Specialty'}
                  </button>
                </form>
              </div>

              {/* Current Specialties List */}
              {selectedService.service_specialties && selectedService.service_specialties.length > 0 && (
                <div className="border-t border-gray-200 pt-4 mb-5">
                  <label className="block text-gray-700 text-xs font-semibold mb-2">
                    Current Service Specialties
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedService.service_specialties.map((specialtyItem, idx) => {
                      const specialtyName = specialtyItem.specialty?.specialty_name;
                      return specialtyName ? (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-xs"
                        >
                          {getSpecialtyIcon(specialtyName)}
                          <span>{formatSpecialtyName(specialtyName)}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Product Usage List */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">Product Usage</h3>
                  <span className="text-[10px] text-gray-500">{selectedServiceUsages.length} product(s)</span>
                </div>
                
                {isLoadingUsages ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : selectedServiceUsages.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedServiceUsages.map((usage, index) => {
                      const productUnit = getProductUnit(usage);
                      const productUnitSize = getProductUnitSize(usage);
                      const unitDisplay = productUnit && productUnitSize ? `${productUnit}` : productUnit ? productUnit : '';
                      
                      return (
                        <div key={index} className="bg-gray-50 rounded-lg p-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-pink-100 rounded-lg flex items-center justify-center">
                              <Package size={12} className="text-pink-600" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">
                                {getProductNameFromUsage(usage)}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Usage: {usage.estimated_usage} {unitDisplay}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <Package size={24} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500">No products linked</p>
                  </div>
                )}
              </div>

              {/* Add Product Usage Form - Compact */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Add Product Usage</h3>
                <form onSubmit={handleAddProductUsage} className="space-y-3">
                  {usageFormError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-red-500" />
                      <p className="text-red-600 text-xs">{usageFormError}</p>
                    </div>
                  )}

                  <input type="hidden" name="service_id" value={usageFormData.service_id} />
                  
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Select Product *
                    </label>
                    <div className="relative">
                      <div className="relative">
                        <Package size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                          className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                        <ChevronDown 
                          size={14} 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                          onClick={() => setShowProductDropdown(!showProductDropdown)}
                        />
                      </div>
                      
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {filteredProducts.map(product => (
                            <div
                              key={product.id}
                              onClick={() => handleSelectProduct(product)}
                              className="px-3 py-1.5 hover:bg-pink-50 cursor-pointer transition-colors text-sm"
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
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center">
                          <p className="text-gray-500 text-xs">No products found.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Estimated Usage *
                    </label>
                    <input
                      type="number"
                      name="estimated_usage"
                      value={usageFormData.estimated_usage}
                      onChange={handleUsageInputChange}
                      step="0.01"
                      placeholder="Amount used per service"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUsageModal(false);
                        setSelectedService(null);
                        setSelectedServiceUsages([]);
                      }}
                      className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isLoadingUsages}
                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                    >
                      {isLoadingUsages ? 'Adding...' : 'Add Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal - Compact */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingService ? 'Edit Service' : 'Add New Service'}
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

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-red-500" />
                  <p className="text-red-600 text-xs">{formError}</p>
                </div>
              )}
              
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  name="service_name"
                  value={formData.service_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Duration (min) *
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    step="15"
                    min="15"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-1">
                  Status
                </label>
                <select
                  name="service_status"
                  value={formData.service_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_multitaskable"
                    checked={formData.is_multitaskable}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_multitaskable: e.target.checked }))}
                    className="w-3.5 h-3.5 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                  />
                  <span className="text-gray-700 text-xs font-semibold">
                    Allow Multi-tasking
                  </span>
                </label>
                <p className="text-[10px] text-gray-500 mt-0.5 ml-5">
                  Enable if this service can be performed simultaneously
                </p>
              </div>

              <div className="flex gap-2 pt-2">
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
                  disabled={isLoading}
                  className="flex-1 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (editingService ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State - Smaller */}
      {filteredServices.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Scissors size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">No services found</h3>
          <p className="text-sm text-gray-500 mb-3">Click "Add Service" to create your first service</p>
          <button 
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-sm"
          >
            <Plus size={14} />
            <span>Add Service</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Services;