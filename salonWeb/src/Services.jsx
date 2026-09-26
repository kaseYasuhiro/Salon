import { useState, useEffect } from 'react';
import { 
  Scissors, Sparkles, Hand, Clock, DollarSign, 
  Edit, Eye, Plus, Search, Filter, Trash2,
  Star, Users, Calendar, Package, Activity, X, AlertCircle,
  ChevronDown, CheckCircle, Tag, Save, EyeOff, Palette, Ruler, Maximize, Trash
} from 'lucide-react';
import api from '../api/axios';

function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [services, setServices] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [specialtiesList, setSpecialtiesList] = useState([]);
  const [hairColors, setHairColors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceUsages, setSelectedServiceUsages] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [formError, setFormError] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Add/Edit Hair Color modal state ──
  const [showHairColorModal, setShowHairColorModal] = useState(false);
  const [isSavingHairColor, setIsSavingHairColor] = useState(false);
  const [hairColorError, setHairColorError] = useState('');
  const [editingHairColor, setEditingHairColor] = useState(null);
  const [hairColorForm, setHairColorForm] = useState({
    color_name: '',
    color_code: '#000000',
    is_active: true,
  });

  // ── Manage Hair Colors panel state ──
  const [hairColorsOpen, setHairColorsOpen] = useState(true);

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
    is_multitaskable: false,
    reqHairColor: false,
    price_adjustments: [
      {
        hair_length: 'short',
        hair_thickness: 'thin',
        additional_price: '0'
      }
    ]
  });

  const hairLengthOptions = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' }
  ];

  const hairThicknessOptions = [
    { value: 'thin', label: 'Thin' },
    { value: 'medium', label: 'Medium' },
    { value: 'thick', label: 'Thick' }
  ];

  const [serviceSpecialtyFormData, setServiceSpecialtyFormData] = useState({
    service_id: '',
    specialty_id: ''
  });

  const [stats, setStats] = useState([
    { label: 'Total Services', value: '0', icon: Scissors, bgColor: 'bg-pink-50', textColor: 'text-pink-600' },
    { label: 'Active Services', value: '0', icon: Activity, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { label: 'Inactive Services', value: '0', icon: EyeOff, bgColor: 'bg-red-50', textColor: 'text-red-600' },
    { label: 'Avg. Price', value: '₱0', icon: DollarSign, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  ]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const addPriceAdjustment = () => {
    setFormData(prev => ({
      ...prev,
      price_adjustments: [
        ...prev.price_adjustments,
        { hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }
      ]
    }));
  };

  const removePriceAdjustment = (index) => {
    if (formData.price_adjustments.length <= 1) {
      showToast('You need at least one price adjustment.', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      price_adjustments: prev.price_adjustments.filter((_, i) => i !== index)
    }));
  };

  const updatePriceAdjustment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      price_adjustments: prev.price_adjustments.map((adj, i) => 
        i === index ? { ...adj, [field]: value } : adj
      )
    }));
  };

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const servicesResponse = await api.get('/services');
      const specialtiesResponse = await api.get('/services/specialties');
      const priceAdjustmentsResponse = await api.get('/services/price/adjustment');

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

      const priceAdjustmentsMap = new Map();
      if (Array.isArray(priceAdjustmentsResponse.data)) {
        priceAdjustmentsResponse.data.forEach(service => {
          if (service.service_price_adjustments && service.service_price_adjustments.length > 0) {
            priceAdjustmentsMap.set(service.id, service.service_price_adjustments);
          }
        });
      }

      let servicesWithData = [];
      if (Array.isArray(servicesResponse.data)) {
        servicesWithData = servicesResponse.data.map(service => ({
          ...service,
          service_specialties: specialtiesMap.get(service.id) || [],
          service_price_adjustments: priceAdjustmentsMap.get(service.id) || []
        }));
      }

      setServices(servicesWithData);

      const activeServices = servicesWithData.filter(s => s.service_status === 'active').length;
      const inactiveServices = servicesWithData.filter(s => s.service_status === 'inactive').length;
      const totalPrice = servicesWithData.reduce((sum, s) => sum + parseFloat(s.price), 0);
      const avgPrice = servicesWithData.length > 0 ? totalPrice / servicesWithData.length : 0;

      setStats([
        { ...stats[0], value: servicesWithData.length.toString() },
        { ...stats[1], value: activeServices.toString() },
        { ...stats[2], value: inactiveServices.toString() },
        { ...stats[3], value: `₱${avgPrice.toFixed(0)}` },
      ]);
    } catch (error) {
      // silently ignore
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      if (Array.isArray(response.data)) setAllProducts(response.data);
    } catch (error) {
      // silently ignore
    }
  };

  const fetchSpecialtiesList = async () => {
    try {
      const response = await api.get('/specialties');
      if (Array.isArray(response.data)) setSpecialtiesList(response.data);
    } catch (error) {
      // silently ignore
    }
  };

  const fetchHairColors = async () => {
    try {
      const response = await api.get('/haircolors');
      if (Array.isArray(response.data)) setHairColors(response.data);
    } catch (error) {
      // silently ignore
    }
  };

  const handleOpenHairColorModal = (color = null) => {
    if (color) {
      setEditingHairColor(color);
      setHairColorForm({
        color_name: color.color_name || '',
        color_code: (color.color_code || '#000000').toUpperCase(),
        is_active: color.is_active === 1 || color.is_active === true,
      });
    } else {
      setEditingHairColor(null);
      setHairColorForm({
        color_name: '',
        color_code: '#000000',
        is_active: true,
      });
    }
    setHairColorError('');
    setShowHairColorModal(true);
  };

  const handleSaveHairColor = async (e) => {
    e.preventDefault();

    if (!hairColorForm.color_name.trim()) {
      setHairColorError('Color name is required.');
      return;
    }
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hairColorForm.color_code)) {
      setHairColorError('Color code must be a valid hex (e.g. #FF5733).');
      return;
    }

    setIsSavingHairColor(true);
    setHairColorError('');

    const payload = {
      color_name: hairColorForm.color_name.trim(),
      color_code: hairColorForm.color_code.toUpperCase(),
      is_active: hairColorForm.is_active ? 1 : 0,
    };

    try {
      if (editingHairColor) {
        await api.post(`/haircolors/update/${editingHairColor.id}`, payload);
        showToast('Hair color updated successfully!', 'success');
      } else {
        await api.post('/haircolors/add', payload);
        showToast('Hair color added successfully!', 'success');
      }

      setShowHairColorModal(false);
      setEditingHairColor(null);
      setHairColorForm({ color_name: '', color_code: '#000000', is_active: true });

      await fetchHairColors();
    } catch (error) {
      const msg =
        error.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join(' ')
          : error.response?.data?.message || 'Failed to save hair color.';
      setHairColorError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingHairColor(false);
    }
  };

  const fetchProductUsages = async (serviceId) => {
    setIsLoadingUsages(true);
    try {
      const response = await api.get(`/service/usage/${serviceId}`);
      if (Array.isArray(response.data)) {
        setSelectedServiceUsages(response.data);
      } else {
        setSelectedServiceUsages([]);
      }
    } catch (error) {
      setSelectedServiceUsages([]);
    } finally {
      setIsLoadingUsages(false);
    }
  };

  const fetchServicePriceAdjustments = async (serviceId) => {
    try {
      const response = await api.get(`/services/price/adjustment/${serviceId}`);
      return response.data;
    } catch (error) {
      return [];
    }
  };

  useEffect(() => {
    fetchServices();
    fetchProducts();
    fetchSpecialtiesList();
    fetchHairColors();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    setFormError('');
  };

  const handleUsageInputChange = (e) => {
    const { name, value } = e.target;
    setUsageFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceSpecialtyChange = (e) => {
    const { name, value } = e.target;
    setServiceSpecialtyFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectProduct = (product) => {
    setUsageFormData({
      ...usageFormData,
      product_id: product.id,
      product_name: product.product_name
    });
    setProductSearchTerm(product.product_name);
    setShowProductDropdown(false);
  };

  const filteredProducts = allProducts.filter(product =>
    product.product_name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // SAVE ALL CHANGES — now only handles specialties + products (hair colors managed elsewhere)
  const handleSaveAllChanges = async () => {
    if (!selectedService) return;

    const hasSpecialtyToAdd = serviceSpecialtyFormData.specialty_id;
    const hasProductToAdd = usageFormData.product_id && usageFormData.estimated_usage;

    if (!hasSpecialtyToAdd && !hasProductToAdd) {
      showToast('No changes to save. Please add a specialty or product usage.', 'info');
      return;
    }

    setIsSavingAll(true);
    try {
      const updateData = {
        service_id: selectedService.id,
        specialty_id: hasSpecialtyToAdd ? parseInt(serviceSpecialtyFormData.specialty_id) : null,
        product_id: hasProductToAdd ? parseInt(usageFormData.product_id) : null,
        estimated_usage: hasProductToAdd ? parseFloat(usageFormData.estimated_usage) : null,
      };

      if (hasSpecialtyToAdd || hasProductToAdd) {
        const response = await api.post('/services/update-all', updateData);
        if (!response.data.success) {
          showToast(response.data.message || 'Some changes could not be saved.', 'warning');
        }
      }

      showToast('Changes saved successfully!', 'success');

      setServiceSpecialtyFormData({ service_id: selectedService.id, specialty_id: '' });
      setUsageFormData({ service_id: selectedService.id, product_id: '', product_name: '', estimated_usage: '' });
      setProductSearchTerm('');

      await fetchServices();
      await fetchProductUsages(selectedService.id);
      await fetchHairColors();
    } catch (error) {
      showToast(error.response?.data?.message || 'Error saving changes. Please try again.', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();

    if (!formData.service_name || !formData.description || !formData.price || !formData.duration_minutes) {
      setFormError('Please fill in all fields');
      return;
    }

    for (const adj of formData.price_adjustments) {
      if (!adj.hair_length || !adj.hair_thickness || parseFloat(adj.additional_price) < 0) {
        setFormError('Please fill in all price adjustment fields correctly.');
        return;
      }
    }

    setIsLoading(true);
    try {
      await api.post('/service/add', {
        service_name: formData.service_name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        service_status: formData.service_status,
        is_multitaskable: formData.is_multitaskable,
        reqHairColor: formData.reqHairColor,
        price_adjustments: formData.price_adjustments.map(adj => ({
          hair_length: adj.hair_length,
          hair_thickness: adj.hair_thickness,
          additional_price: parseFloat(adj.additional_price) || 0
        }))
      });

      showToast('Service added successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (error) {
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

    for (const adj of formData.price_adjustments) {
      if (!adj.hair_length || !adj.hair_thickness || parseFloat(adj.additional_price) < 0) {
        setFormError('Please fill in all price adjustment fields correctly.');
        return;
      }
    }

    setIsLoading(true);
    try {
      await api.post(`/services/update/${editingService.id}`, {
        service_name: formData.service_name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        service_status: formData.service_status,
        is_multitaskable: formData.is_multitaskable,
        reqHairColor: formData.reqHairColor,
        price_adjustments: formData.price_adjustments.map(adj => ({
          hair_length: adj.hair_length,
          hair_thickness: adj.hair_thickness,
          additional_price: parseFloat(adj.additional_price) || 0
        }))
      });

      showToast('Service updated successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Error updating service');
      showToast(error.response?.data?.message || 'Error updating service', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      service_name: '',
      description: '',
      price: '',
      duration_minutes: '',
      service_status: 'active',
      is_multitaskable: false,
      reqHairColor: false,
      price_adjustments: [
        { hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }
      ]
    });
    setEditingService(null);
    setFormError('');
  };

  const handleEdit = async (service) => {
    setEditingService(service);

    try {
      const adjustments = await fetchServicePriceAdjustments(service.id);

      let priceAdjustments = [];
      if (Array.isArray(adjustments) && adjustments.length > 0) {
        priceAdjustments = adjustments.map(adj => ({
          hair_length: adj.hair_length || 'short',
          hair_thickness: adj.hair_thickness || 'thin',
          additional_price: adj.additional_price?.toString() || '0'
        }));
      } else {
        priceAdjustments = [{ hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }];
      }

      setFormData({
        service_name: service.service_name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        service_status: service.service_status,
        is_multitaskable: service.is_multitaskable || false,
        reqHairColor: service.reqHairColor || false,
        price_adjustments: priceAdjustments
      });
    } catch (error) {
      setFormData({
        service_name: service.service_name,
        description: service.description,
        price: service.price,
        duration_minutes: service.duration_minutes,
        service_status: service.service_status,
        is_multitaskable: service.is_multitaskable || false,
        reqHairColor: service.reqHairColor || false,
        price_adjustments: [{ hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }]
      });
    }

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
    if (searchTerm && !service.service_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter === 'active' && service.service_status !== 'active') return false;
    if (statusFilter === 'inactive' && service.service_status !== 'inactive') return false;
    return true;
  });

  const formatSpecialtyName = (specialtyName) => {
    if (!specialtyName) return '';
    return specialtyName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

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

  const getProductNameFromUsage = (usage) => {
    if (usage.product && usage.product.product_name) return usage.product.product_name;
    if (usage.product_name) return usage.product_name;
    const foundProduct = allProducts.find(p => p.id === usage.product_id);
    if (foundProduct) return foundProduct.product_name;
    return `Product ID: ${usage.product_id}`;
  };

  const getProductUnit = (usage) => {
    if (usage.product && usage.product.unit) return usage.product.unit;
    const foundProduct = allProducts.find(p => p.id === usage.product_id);
    if (foundProduct && foundProduct.unit) return foundProduct.unit;
    return '';
  };

  const getProductUnitSize = (usage) => {
    if (usage.product && usage.product.unit_size) return usage.product.unit_size;
    const foundProduct = allProducts.find(p => p.id === usage.product_id);
    if (foundProduct && foundProduct.unit_size) return foundProduct.unit_size;
    return '';
  };

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
            toast.type === 'success' ? 'bg-green-500' : 
            toast.type === 'warning' ? 'bg-yellow-500' :
            'bg-red-500'
          } text-white min-w-[300px]`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
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

      {/* ✅ Hair Colors Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setHairColorsOpen(prev => !prev)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-purple-50 p-1.5 rounded-lg">
              <Palette size={14} className="text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-800">
                Hair Colors
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({hairColors.length})
                </span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Master list of available hair colors
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleOpenHairColorModal();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-md transition-all text-[10px] font-semibold cursor-pointer"
            >
              <Plus size={12} />
              <span>Add Color</span>
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform duration-200 ${hairColorsOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {hairColorsOpen && (
          <div className="border-t border-gray-100 p-4">
            {hairColors.length === 0 ? (
              <div className="text-center py-8">
                <Palette size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No hair colors yet</p>
                <button
                  onClick={() => handleOpenHairColorModal()}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors text-xs"
                >
                  <Plus size={12} />
                  <span>Add Your First Color</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {hairColors.map((color) => {
                  const isInactive = color.is_active === 0 || color.is_active === false;
                  return (
                    <div
                      key={color.id}
                      className={`relative rounded-lg border p-3 transition-all hover:shadow-md ${
                        isInactive
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-gray-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-200 flex-shrink-0"
                          style={{ backgroundColor: color.color_code || '#808080' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {color.color_name}
                          </p>
                          <p className="text-[9px] text-gray-500 font-mono uppercase">
                            {color.color_code}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            isInactive
                              ? 'bg-red-100 text-red-600'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {isInactive ? 'Inactive' : 'Active'}
                        </span>
                        <button
                          onClick={() => handleOpenHairColorModal(color)}
                          className="p-1 rounded hover:bg-pink-50 transition-colors"
                          title="Edit color"
                        >
                          <Edit size={12} className="text-pink-500" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'grid' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-sm ${
              viewMode === 'list' ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
          >
            <option value="all">All Services</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={() => handleOpenHairColorModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-500 text-pink-600 rounded-lg hover:bg-pink-50 transition-all duration-300 text-sm font-medium"
          >
            <Palette size={14} />
            <span>Add Hair Color</span>
          </button>
          
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

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => {
            const isInactive = service.service_status === 'inactive';
            const hasHairColor = service.reqHairColor === true || service.reqHairColor === 1;
            
            return (
              <div 
                key={service.id} 
                onClick={() => handleServiceClick(service)}
                className={`bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border overflow-hidden cursor-pointer group ${
                  isInactive ? 'border-red-200 opacity-75' : 'border-gray-100'
                }`}
              >
                <div className={`relative h-24 flex items-center justify-center ${
                  isInactive ? 'bg-gray-100' : 'bg-gradient-to-r from-pink-50 to-purple-50'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                    isInactive ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-500 to-pink-600'
                  }`}>
                    <Scissors size={24} className="text-white" />
                  </div>
                  {isInactive && (
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
                  {hasHairColor && (
                    <div className="absolute top-1.5 right-1.5 bg-purple-500 rounded-full px-1.5 py-0.5 shadow-md">
                      <div className="flex items-center gap-0.5">
                        <Palette size={10} className="text-white" />
                        <span className="text-[8px] font-semibold text-white">Hair Color</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <div className="mb-2">
                    <h3 className={`text-sm font-semibold truncate ${isInactive ? 'text-gray-500' : 'text-gray-800'}`}>
                      {service.service_name}
                    </h3>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                      {service.description}
                    </p>
                  </div>
                  
                  <div className="mb-2 min-h-[32px]">
                    {service.service_specialties && service.service_specialties.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {service.service_specialties.slice(0, 2).map((specialtyItem, idx) => {
                          const specialtyName = specialtyItem.specialty?.specialty_name;
                          return specialtyName ? (
                            <span 
                              key={idx} 
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isInactive ? 'bg-gray-200 text-gray-600' : 'bg-pink-100 text-pink-700'
                              }`}
                            >
                              {getSpecialtyIcon(specialtyName)}
                              <span>{formatSpecialtyName(specialtyName)}</span>
                            </span>
                          ) : null;
                        })}
                        {service.service_specialties.length > 2 && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isInactive ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            +{service.service_specialties.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] italic text-gray-400">No specialties</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-0.5 font-bold ${isInactive ? 'text-gray-500' : 'text-green-600'}`}>
                      <span className="text-sm">₱{parseFloat(service.price).toFixed(2)}</span>
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs ${isInactive ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock size={10} />
                      <span>{service.duration_minutes} min</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(service);
                    }}
                    className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                      isInactive 
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
                        : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                    }`}
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

      {/* List View */}
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
                {filteredServices.map((service) => {
                  const isInactive = service.service_status === 'inactive';
                  const hasHairColor = service.reqHairColor === true || service.reqHairColor === 1;
                  
                  return (
                    <tr 
                      key={service.id} 
                      onClick={() => handleServiceClick(service)}
                      className={`hover:bg-pink-50/30 transition-colors duration-200 cursor-pointer ${isInactive ? 'opacity-75' : ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isInactive ? 'bg-gray-400' : 'bg-gradient-to-r from-pink-500 to-pink-600'
                          }`}>
                            <Scissors size={14} className="text-white" />
                          </div>
                          <span className={`text-sm font-semibold ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}>
                            {service.service_name}
                          </span>
                          {hasHairColor && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                              <Palette size={10} />
                              Hair Color
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-xs max-w-xs truncate ${isInactive ? 'text-gray-400' : 'text-gray-600'}`}>
                          {service.description}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {service.service_specialties && service.service_specialties.length > 0 ? (
                            service.service_specialties.slice(0, 2).map((specialtyItem, idx) => {
                              const specialtyName = specialtyItem.specialty?.specialty_name;
                              return specialtyName ? (
                                <span 
                                  key={idx} 
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    isInactive ? 'bg-gray-200 text-gray-600' : 'bg-pink-100 text-pink-700'
                                  }`}
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
                        <div className={`flex items-center gap-1 ${isInactive ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Clock size={10} />
                          <span className="text-xs">{service.duration_minutes} min</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-semibold ${isInactive ? 'text-gray-500' : 'text-gray-800'}`}>
                          ₱{parseFloat(service.price).toFixed(2)}
                        </span>
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(service);
                          }}
                          className={`p-1 rounded transition-colors ${isInactive ? 'hover:bg-gray-200' : 'hover:bg-gray-100'}`}
                        >
                          <Edit size={14} className="text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {showUsageModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-xl font-bold text-white">{selectedService.service_name}</h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSaveAllChanges}
                  disabled={isSavingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-pink-600 rounded-lg hover:bg-pink-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSavingAll ? (
                    <>
                      <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save All Changes
                    </>
                  )}
                </button>
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
            </div>

            <div 
              className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 'calc(90vh - 72px)' }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN */}
                <div>
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Service Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-gray-600"><span className="font-semibold">Description:</span> {selectedService.description}</p>
                      <p className="text-sm text-gray-600"><span className="font-semibold">Duration:</span> {selectedService.duration_minutes} minutes</p>
                      <p className="text-sm text-gray-600"><span className="font-semibold">Price:</span> ₱{parseFloat(selectedService.price).toFixed(2)}</p>
                      <div className="flex flex-wrap gap-2">
                        <p className="text-sm text-gray-600"><span className="font-semibold">Status:</span> 
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            selectedService.service_status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedService.service_status}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600"><span className="font-semibold">Multi-taskable:</span> 
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            selectedService.is_multitaskable 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedService.is_multitaskable ? 'Yes' : 'No'}
                          </span>
                        </p>
                        <p className="text-sm text-gray-600"><span className="font-semibold">Hair Color Required:</span> 
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            selectedService.reqHairColor 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedService.reqHairColor ? 'Yes' : 'No'}
                          </span>
                        </p>
                      </div>
                      
                      {selectedService.service_price_adjustments && selectedService.service_price_adjustments.length > 0 ? (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-600 font-semibold">Price Adjustments:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedService.service_price_adjustments.map((adj, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs border border-blue-200">
                                <Ruler size={14} />
                                {adj.hair_length} / {adj.hair_thickness}
                                <span className="ml-1 text-green-600 font-semibold">+₱{parseFloat(adj.additional_price).toFixed(2)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-400 italic">No price adjustments configured</p>
                        </div>
                      )}
                      
                      {selectedService.service_specialties && selectedService.service_specialties.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-sm text-gray-600 font-semibold">Specialties:</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
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
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Service Specialty</h3>
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Select Specialty *
                      </label>
                      <select
                        name="specialty_id"
                        value={serviceSpecialtyFormData.specialty_id}
                        onChange={handleServiceSpecialtyChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="">Select a specialty...</option>
                        {specialtiesList.map((specialty) => (
                          <option key={specialty.id} value={specialty.id}>
                            {formatSpecialtyName(specialty.specialty_name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedService.service_specialties && selectedService.service_specialties.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mb-6">
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
                </div>

                {/* RIGHT COLUMN */}
                <div>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-800">Product Usage</h3>
                      <span className="text-xs text-gray-500">{selectedServiceUsages.length} product(s)</span>
                    </div>
                    
                    {isLoadingUsages ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : selectedServiceUsages.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {selectedServiceUsages.map((usage, index) => {
                          const productUnit = getProductUnit(usage);
                          const unitDisplay = productUnit ? productUnit : '';
                          
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
                                    Usage: {usage.estimated_usage} {unitDisplay}
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
                        <p className="text-sm text-gray-500">No products linked</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Add Product Usage</h3>
                    <input type="hidden" name="service_id" value={usageFormData.service_id} />
                    
                    <div className="space-y-3">
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
                              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                            <ChevronDown 
                              size={14} 
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
                                  className="px-3 py-2 hover:bg-pink-50 cursor-pointer transition-colors text-sm"
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
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ✅ Hair color management note */}
                  {selectedService.reqHairColor && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-start gap-3">
                          <Palette size={18} className="text-purple-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-purple-800">
                              Hair colors are managed globally
                            </p>
                            <p className="text-xs text-purple-700 mt-1">
                              When a customer books this service, they'll pick from the master
                              list of active colors. To add or edit colors, use the
                              <span className="font-semibold"> "Hair Colors"</span> panel above.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowUsageModal(false);
                    setSelectedService(null);
                    setSelectedServiceUsages([]);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh]">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
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

            <div 
              className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 'calc(90vh - 72px)' }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <p className="text-red-600 text-sm">{formError}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      name="service_name"
                      value={formData.service_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Duration (min) *
                    </label>
                    <input
                      type="number"
                      name="duration_minutes"
                      value={formData.duration_minutes}
                      onChange={handleInputChange}
                      step="15"
                      min="15"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-semibold mb-1">
                      Status
                    </label>
                    <select
                      name="service_status"
                      value={formData.service_status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Price Adjustments</h3>
                    <button
                      type="button"
                      onClick={addPriceAdjustment}
                      className="flex items-center gap-1 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-sm font-medium"
                    >
                      <Plus size={14} />
                      Add Row
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Define additional pricing based on hair length and thickness combinations.</p>
                  
                  <div className="space-y-3">
                    {formData.price_adjustments.map((adjustment, index) => (
                      <div key={index} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-gray-600 text-[10px] font-semibold mb-0.5">
                              Hair Length
                            </label>
                            <select
                              value={adjustment.hair_length}
                              onChange={(e) => updatePriceAdjustment(index, 'hair_length', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                            >
                              {hairLengthOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-gray-600 text-[10px] font-semibold mb-0.5">
                              Hair Thickness
                            </label>
                            <select
                              value={adjustment.hair_thickness}
                              onChange={(e) => updatePriceAdjustment(index, 'hair_thickness', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-white"
                            >
                              {hairThicknessOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-gray-600 text-[10px] font-semibold mb-0.5">
                              Additional Price
                            </label>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500 text-sm font-medium">₱</span>
                              <input
                                type="number"
                                value={adjustment.additional_price}
                                onChange={(e) => updatePriceAdjustment(index, 'additional_price', e.target.value)}
                                step="0.01"
                                min="0"
                                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePriceAdjustment(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end"
                          title="Remove this adjustment"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_multitaskable"
                        checked={formData.is_multitaskable}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_multitaskable: e.target.checked }))}
                        className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                      />
                      <span className="text-gray-700 text-sm font-semibold">
                        Allow Multi-tasking
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="reqHairColor"
                        checked={formData.reqHairColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, reqHairColor: e.target.checked }))}
                        className="w-4 h-4 text-purple-500 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-gray-700 text-sm font-semibold">
                        Requires Hair Color
                      </span>
                    </label>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 ml-6">
                    Enable multi-tasking if this service can be performed simultaneously. Enable hair color if this service requires selecting a hair color. The colors shown to customers come from the Hair Colors panel above.
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
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : (editingService ? 'Update' : 'Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Hair Color Modal */}
      {showHairColorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingHairColor ? 'Edit Hair Color' : 'Add Hair Color'}
              </h2>
              <button
                onClick={() => {
                  setShowHairColorModal(false);
                  setEditingHairColor(null);
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveHairColor} className="p-6 space-y-4">
              {hairColorError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500" />
                  <p className="text-red-600 text-sm">{hairColorError}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Color Name *
                </label>
                <input
                  type="text"
                  value={hairColorForm.color_name}
                  onChange={(e) =>
                    setHairColorForm(prev => ({ ...prev, color_name: e.target.value }))
                  }
                  placeholder="e.g. Ash Blonde, Burgundy"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                  disabled={isSavingHairColor}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Color Code *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hairColorForm.color_code}
                    onChange={(e) =>
                      setHairColorForm(prev => ({
                        ...prev,
                        color_code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    disabled={isSavingHairColor}
                  />
                  <input
                    type="text"
                    value={hairColorForm.color_code}
                    onChange={(e) =>
                      setHairColorForm(prev => ({
                        ...prev,
                        color_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="#000000"
                    maxLength={7}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
                    disabled={isSavingHairColor}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Pick from the color picker or paste a hex code (e.g. #FF5733).
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-1">
                  Preview
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                    style={{ backgroundColor: hairColorForm.color_code }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {hairColorForm.color_name || 'Untitled Color'}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {hairColorForm.color_code}
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hairColorForm.is_active}
                  onChange={(e) =>
                    setHairColorForm(prev => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500"
                  disabled={isSavingHairColor}
                />
                <span className="text-gray-700 text-sm font-semibold">
                  Mark as active
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHairColorModal(false);
                    setEditingHairColor(null);
                  }}
                  disabled={isSavingHairColor}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHairColor}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingHairColor ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Palette size={16} />
                      {editingHairColor ? 'Save Changes' : 'Add Color'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredServices.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Scissors size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            {statusFilter === 'inactive' 
              ? 'No inactive services found' 
              : statusFilter === 'active'
                ? 'No active services found'
                : 'No services found'}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : statusFilter === 'inactive'
                ? 'All services are currently active'
                : 'Click "Add Service" to create your first service'}
          </p>
          {!searchTerm && statusFilter !== 'inactive' && (
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
          )}
        </div>
      )}
    </div>
  );
}

export default Services;