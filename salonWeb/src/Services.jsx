import { useState, useEffect } from 'react';
import {
  Scissors, Sparkles, Hand, Clock,
  Edit, Eye, Plus, Search, Filter, Trash2,
  Star, Users, Calendar, Package, Activity, X, AlertCircle,
  ChevronDown, CheckCircle, Tag, Save, EyeOff, Palette, Ruler, Maximize, Trash,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles as SparklesIcon, Crown
} from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────────────────
// Stat card icons config (gradient-driven)
// ─────────────────────────────────────────────────────────────
const STAT_META = [
  { key: 'total',     color: 'from-pink-500 to-fuchsia-600',    bgColor: 'bg-pink-50',    icon: Scissors },
  { key: 'active',    color: 'from-emerald-500 to-green-600',   bgColor: 'bg-emerald-50', icon: Activity },
  { key: 'inactive',  color: 'from-red-500 to-rose-600',        bgColor: 'bg-red-50',     icon: EyeOff },
  { key: 'avgPrice',  color: 'from-blue-500 to-indigo-600',     bgColor: 'bg-blue-50',    icon: null },
];

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
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceUsages, setSelectedServiceUsages] = useState([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formError, setFormError] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const [isRemovingSpecialty, setIsRemovingSpecialty] = useState(false);

  // Hair Color sub-modal
  const [showHairColorModal, setShowHairColorModal] = useState(false);
  const [isSavingHairColor, setIsSavingHairColor] = useState(false);
  const [hairColorError, setHairColorError] = useState('');
  const [editingHairColor, setEditingHairColor] = useState(null);
  const [hairColorForm, setHairColorForm] = useState({
    color_name: '',
    color_code: '#000000',
    is_active: true,
  });

  const [selectedHairColorIds, setSelectedHairColorIds] = useState([]);

  const [usageFormData, setUsageFormData] = useState({
    service_id: '',
    product_id: '',
    product_name: '',
    estimated_usage: ''
  });

  const [serviceSpecialtyFormData, setServiceSpecialtyFormData] = useState({
    service_id: '',
    specialty_id: ''
  });

  const [formData, setFormData] = useState({
    service_name: '',
    price: '',
    duration_minutes: '',
    service_status: 'active',
    is_multitaskable: false,
    reqHairColor: false,
    price_adjustments: [
      { hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }
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

  const [stats, setStats] = useState([
    { label: 'Total Services', value: '0', icon: Scissors },
    { label: 'Active Services', value: '0', icon: Activity },
    { label: 'Inactive Services', value: '0', icon: EyeOff },
    { label: 'Avg. Price', value: '₱0', icon: null },
  ]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ── Price adjustment helpers ──
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

  // ── Fetchers ──
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
          if (!specialtiesMap.has(serviceId)) specialtiesMap.set(serviceId, []);
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
    } catch (error) {}
  };

  const fetchSpecialtiesList = async () => {
    try {
      const response = await api.get('/specialties');
      if (Array.isArray(response.data)) setSpecialtiesList(response.data);
    } catch (error) {}
  };

  const fetchHairColors = async () => {
    try {
      const response = await api.get('/haircolors');
      if (Array.isArray(response.data)) setHairColors(response.data);
    } catch (error) {}
  };

  const fetchServiceHairColors = async (serviceId) => {
    try {
      const response = await api.get(`/services/haircolors/${serviceId}`);
      if (Array.isArray(response.data)) {
        const ids = response.data
          .map(item => item.hair_color_id ?? item.hair_color?.id)
          .filter(id => id != null);
        setSelectedHairColorIds(ids);
      } else {
        setSelectedHairColorIds([]);
      }
    } catch (error) {
      setSelectedHairColorIds([]);
    }
  };

  const fetchProductUsages = async (serviceId) => {
    setIsLoadingUsages(true);
    try {
      const response = await api.get(`/service/usage/${serviceId}`);
      setSelectedServiceUsages(Array.isArray(response.data) ? response.data : []);
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

  const removeServiceSpecialty = async (serviceId, specialtyId) => {
    const response = await api.delete('/services/specialties/remove', {
      data: { service_id: serviceId, specialty_id: specialtyId },
    });
    return response.data;
  };

  const toggleHairColorSelection = (colorId) => {
    setSelectedHairColorIds(prev =>
      prev.includes(colorId)
        ? prev.filter(id => id !== colorId)
        : [...prev, colorId]
    );
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
      setHairColorForm({ color_name: '', color_code: '#000000', is_active: true });
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
        const res = await api.post('/haircolors/add', payload);
        showToast('Hair color added successfully!', 'success');
        const newId = res.data?.id ?? res.data?.hair_color?.id;
        if (newId) {
          setSelectedHairColorIds(prev => (prev.includes(newId) ? prev : [...prev, newId]));
        }
      }

      setShowHairColorModal(false);
      setEditingHairColor(null);
      setHairColorForm({ color_name: '', color_code: '#000000', is_active: true });
      await fetchHairColors();
    } catch (error) {
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(' ')
        : error.response?.data?.message || 'Failed to save hair color.';
      setHairColorError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingHairColor(false);
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

  const filteredProducts = allProducts.filter(product => {
    const isInactive = product.is_active === 0 || product.is_active === false;
    if (isInactive) return false;

    return product.product_name.toLowerCase().includes(productSearchTerm.toLowerCase());
  });

  const handleAddNewService = () => {
    setIsCreatingNew(true);
    setSelectedService(null);
    setSelectedServiceUsages([]);
    setSelectedHairColorIds([]);
    setFormData({
      service_name: '',
      price: '',
      duration_minutes: '',
      service_status: 'active',
      is_multitaskable: false,
      reqHairColor: false,
      price_adjustments: [
        { hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }
      ]
    });
    setServiceSpecialtyFormData({ service_id: '', specialty_id: '' });
    setUsageFormData({ service_id: '', product_id: '', product_name: '', estimated_usage: '' });
    setProductSearchTerm('');
    setFormError('');
    setShowModal(true);
  };

  const handleOpenService = async (service) => {
    setIsCreatingNew(false);
    setSelectedService(service);
    setServiceSpecialtyFormData({ service_id: service.id, specialty_id: '' });
    setUsageFormData({ service_id: service.id, product_id: '', product_name: '', estimated_usage: '' });
    setProductSearchTerm('');
    setFormError('');

    let priceAdjustments = [];
    try {
      const adjustments = await fetchServicePriceAdjustments(service.id);
      if (Array.isArray(adjustments) && adjustments.length > 0) {
        priceAdjustments = adjustments.map(adj => ({
          hair_length: adj.hair_length || 'short',
          hair_thickness: adj.hair_thickness || 'thin',
          additional_price: adj.additional_price?.toString() || '0'
        }));
      } else {
        priceAdjustments = [{ hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }];
      }
    } catch {
      priceAdjustments = [{ hair_length: 'short', hair_thickness: 'thin', additional_price: '0' }];
    }

    setFormData({
      service_name: service.service_name,
      price: service.price,
      duration_minutes: service.duration_minutes,
      service_status: service.service_status,
      is_multitaskable: service.is_multitaskable || false,
      reqHairColor: service.reqHairColor || false,
      price_adjustments: priceAdjustments
    });

    await Promise.all([
      fetchProductUsages(service.id),
      fetchServiceHairColors(service.id),
    ]);

    setShowModal(true);
  };

  const handleRemoveSpecialty = async (specialtyId) => {
    if (!selectedService?.id) return;

    const serviceId = selectedService.id;

    setSelectedService((prev) =>
      prev
        ? {
            ...prev,
            service_specialties: (prev.service_specialties || []).filter(
              (s) => s.specialty_id !== specialtyId
            ),
          }
        : prev
    );

    setIsRemovingSpecialty(true);
    try {
      await removeServiceSpecialty(serviceId, specialtyId);
      showToast('Service Specialty removed.', 'success');
      await fetchServices();
    } catch (error) {
      const msg =
        error.response?.data?.errors
          ? Object.values(error.response.data.errors).flat().join(' ')
          : error.response?.data?.message || 'Failed to remove specialty.';
      showToast(msg, 'error');

      try {
        const refreshedSpecialties = await api.get('/services/specialties');
        const restored = Array.isArray(refreshedSpecialties.data)
          ? refreshedSpecialties.data
              .filter((s) => s.service_id === serviceId)
              .map((s) => ({
                id: s.id,
                specialty_id: s.specialty_id,
                specialty: s.specialties,
              }))
          : [];
        setSelectedService((prev) =>
          prev ? { ...prev, service_specialties: restored } : prev
        );
      } catch {
        // leave state
      }
    } finally {
      setIsRemovingSpecialty(false);
    }
  };

  const handleSaveAllChanges = async () => {
    setFormError('');

    if (!formData.service_name || !formData.price || !formData.duration_minutes) {
      setFormError('Please fill in all required service fields.');
      return;
    }

    for (const adj of formData.price_adjustments) {
      if (!adj.hair_length || !adj.hair_thickness || parseFloat(adj.additional_price) < 0) {
        setFormError('Please fill in all price adjustment fields correctly.');
        return;
      }
    }

    setIsSavingAll(true);
    try {
      if (isCreatingNew) {
        // ── CREATE: POST /service/add ──
        const createPayload = {
          service_name: formData.service_name.trim(),
          description: `${formData.service_name.trim()} service.`,
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          is_multitaskable: !!formData.is_multitaskable,
          reqHairColor: !!formData.reqHairColor,
          service_status: formData.service_status,
          price_adjustments: formData.price_adjustments.map(adj => ({
            hair_length: adj.hair_length,
            hair_thickness: adj.hair_thickness,
            additional_price: parseFloat(adj.additional_price) || 0
          })),
        };

        const createRes = await api.post('/service/add', createPayload);
        const newServiceId = createRes.data?.service?.id;

        if (newServiceId) {
          const followUps = [];

          followUps.push(
            api.post('/services/update-all', {
              service_id: newServiceId,
              service_name: createPayload.service_name,
              description: createPayload.description,
              price: createPayload.price,
              duration_minutes: createPayload.duration_minutes,
              is_multitaskable: createPayload.is_multitaskable,
              reqHairColor: createPayload.reqHairColor,
              service_status: createPayload.service_status,
              price_adjustments: createPayload.price_adjustments,
            }).catch(() => {})
          );

          if (serviceSpecialtyFormData.specialty_id) {
            followUps.push(
              api.post('/services/update-all', {
                service_id: newServiceId,
                service_name: createPayload.service_name,
                description: createPayload.description,
                price: createPayload.price,
                duration_minutes: createPayload.duration_minutes,
                is_multitaskable: createPayload.is_multitaskable,
                reqHairColor: createPayload.reqHairColor,
                service_status: createPayload.service_status,
                specialty_id: parseInt(serviceSpecialtyFormData.specialty_id),
              }).catch(() => {})
            );
          }

          if (usageFormData.product_id && usageFormData.estimated_usage) {
            followUps.push(
              api.post('/services/update-all', {
                service_id: newServiceId,
                service_name: createPayload.service_name,
                description: createPayload.description,
                price: createPayload.price,
                duration_minutes: createPayload.duration_minutes,
                is_multitaskable: createPayload.is_multitaskable,
                reqHairColor: createPayload.reqHairColor,
                service_status: createPayload.service_status,
                product_id: parseInt(usageFormData.product_id),
                estimated_usage: parseFloat(usageFormData.estimated_usage),
              }).catch(() => {})
            );
          }

          if (formData.reqHairColor) {
            followUps.push(
              api.post('/services/update-all', {
                service_id: newServiceId,
                service_name: createPayload.service_name,
                description: createPayload.description,
                price: createPayload.price,
                duration_minutes: createPayload.duration_minutes,
                is_multitaskable: createPayload.is_multitaskable,
                reqHairColor: createPayload.reqHairColor,
                service_status: createPayload.service_status,
                hair_color_ids: selectedHairColorIds,
              }).catch(() => {})
            );
          }

          await Promise.all(followUps);
        }

        showToast('Service created successfully!', 'success');
      } else {
        // ── UPDATE: POST /services/update-all ──
        const existingDescription =
          selectedService?.description ||
          `${formData.service_name.trim()} service.`;

        const updatePayload = {
          service_id: selectedService?.id,
          service_name: formData.service_name.trim(),
          description: existingDescription,
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          service_status: formData.service_status,
          is_multitaskable: !!formData.is_multitaskable,
          reqHairColor: !!formData.reqHairColor,
          price_adjustments: formData.price_adjustments.map(adj => ({
            hair_length: adj.hair_length,
            hair_thickness: adj.hair_thickness,
            additional_price: parseFloat(adj.additional_price) || 0
          })),
        };

        if (serviceSpecialtyFormData.specialty_id) {
          updatePayload.specialty_id = parseInt(serviceSpecialtyFormData.specialty_id);
        }

        if (usageFormData.product_id && usageFormData.estimated_usage) {
          updatePayload.product_id = parseInt(usageFormData.product_id);
          updatePayload.estimated_usage = parseFloat(usageFormData.estimated_usage);
        }

        const updateRes = await api.post('/services/update-all', updatePayload);

        if (updateRes.data.success === false) {
          showToast(updateRes.data.message || 'Some changes could not be saved.', 'warning');
        } else {
          showToast('Service updated successfully!', 'success');
        }
      }

      setShowModal(false);
      setSelectedService(null);
      setIsCreatingNew(false);
      setSelectedHairColorIds([]);
      setServiceSpecialtyFormData({ service_id: '', specialty_id: '' });
      setUsageFormData({ service_id: '', product_id: '', product_name: '', estimated_usage: '' });
      setProductSearchTerm('');
      await fetchServices();
    } catch (error) {
      const msg = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(' ')
        : error.response?.data?.message || 'Error saving service. Please try again.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSavingAll(false);
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

  if (isLoading && services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in">
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-100 p-3.5 pl-5 flex items-center gap-3 min-w-[300px] max-w-md overflow-hidden">
            <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
              toast.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
            }`}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </div>
            <span className="text-sm font-medium text-slate-700 flex-1">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const meta = STAT_META[index];
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group relative bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 p-5 overflow-hidden"
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.08] bg-gradient-to-br ${meta.color} group-hover:scale-125 transition-transform duration-500`} />
              <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md`}>
                {Icon ? (
                  <Icon size={20} className="text-white" />
                ) : (
                  <span className="text-white font-bold text-base">₱</span>
                )}
              </div>
              <p className="relative text-xs font-medium text-slate-500 mt-4">{stat.label}</p>
              <p className="relative text-3xl font-bold text-slate-800 mt-0.5 tracking-tight">{stat.value}</p>
              <div className={`relative mt-3 h-1 rounded-full ${meta.bgColor} overflow-hidden`}>
                <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${meta.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-xs ${
              viewMode === 'grid' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-xs ${
              viewMode === 'list' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            List View
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent w-48 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          >
            <option value="all">All Services</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={handleAddNewService}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-xs font-semibold"
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
                onClick={() => handleOpenService(service)}
                className={`bg-white rounded-2xl shadow-sm hover:shadow-[0_12px_32px_-16px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition-all duration-300 border overflow-hidden cursor-pointer group ${
                  isInactive ? 'border-red-200/70 opacity-90' : 'border-slate-200/70'
                }`}
              >
                <div className={`relative h-24 flex items-center justify-center ${
                  isInactive ? 'bg-slate-100' : 'bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                    isInactive ? 'bg-slate-400' : 'bg-gradient-to-br from-pink-500 to-fuchsia-600'
                  }`}>
                    <Scissors size={22} className="text-white" />
                  </div>
                  {isInactive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Inactive</span>
                    </div>
                  )}
                  {service.service_specialties && service.service_specialties.length > 0 && (
                    <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm border border-white">
                      <div className="flex items-center gap-1">
                        <Tag size={10} className="text-pink-500" />
                        <span className="text-[10px] font-semibold text-slate-700">
                          {service.service_specialties.length}
                        </span>
                      </div>
                    </div>
                  )}
                  {hasHairColor && (
                    <div className="absolute top-2 right-2 bg-purple-500 rounded-full px-2 py-0.5 shadow-md">
                      <div className="flex items-center gap-1">
                        <Palette size={10} className="text-white" />
                        <span className="text-[9px] font-bold text-white">Hair Color</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="mb-2">
                    <h3 className={`text-sm font-bold truncate ${isInactive ? 'text-slate-500' : 'text-slate-800'}`}>
                      {service.service_name}
                    </h3>
                  </div>

                  <div className="mb-2 min-h-[28px]">
                    {service.service_specialties && service.service_specialties.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {service.service_specialties.slice(0, 2).map((specialtyItem, idx) => {
                          const specialtyName = specialtyItem.specialty?.specialty_name;
                          return specialtyName ? (
                            <span key={idx} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              isInactive ? 'bg-slate-200 text-slate-600' : 'bg-pink-50 text-pink-700 border border-pink-100'
                            }`}>
                              {getSpecialtyIcon(specialtyName)}
                              <span>{formatSpecialtyName(specialtyName)}</span>
                            </span>
                          ) : null;
                        })}
                        {service.service_specialties.length > 2 && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            isInactive ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            +{service.service_specialties.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] italic text-slate-400">No specialties</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className={`flex items-center gap-0.5 font-bold ${isInactive ? 'text-slate-500' : 'text-emerald-600'}`}>
                      <span className="text-sm">₱{parseFloat(service.price).toFixed(2)}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[11px] ${isInactive ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Clock size={11} />
                      <span>{service.duration_minutes} min</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenService(service);
                    }}
                    className={`w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl transition-all text-xs font-semibold ${
                      isInactive
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        : 'bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-100'
                    }`}
                  >
                    <Edit size={12} />
                    Manage & Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Specialties</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map((service) => {
                  const isInactive = service.service_status === 'inactive';
                  const hasHairColor = service.reqHairColor === true || service.reqHairColor === 1;

                  return (
                    <tr
                      key={service.id}
                      onClick={() => handleOpenService(service)}
                      className={`hover:bg-pink-50/40 transition-colors duration-200 cursor-pointer ${isInactive ? 'opacity-80' : ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isInactive ? 'bg-slate-400' : 'bg-gradient-to-br from-pink-500 to-fuchsia-600'
                          }`}>
                            <Scissors size={15} className="text-white" />
                          </div>
                          <span className={`text-sm font-semibold ${isInactive ? 'text-slate-500' : 'text-slate-900'}`}>
                            {service.service_name}
                          </span>
                          {hasHairColor && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold border border-purple-200">
                              <Palette size={10} />
                              Hair Color
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {service.service_specialties && service.service_specialties.length > 0 ? (
                            service.service_specialties.slice(0, 2).map((specialtyItem, idx) => {
                              const specialtyName = specialtyItem.specialty?.specialty_name;
                              return specialtyName ? (
                                <span key={idx} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                  isInactive ? 'bg-slate-200 text-slate-600' : 'bg-pink-50 text-pink-700 border border-pink-100'
                                }`}>
                                  {getSpecialtyIcon(specialtyName)}
                                  <span>{formatSpecialtyName(specialtyName)}</span>
                                </span>
                              ) : null;
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`flex items-center gap-1 ${isInactive ? 'text-slate-400' : 'text-slate-600'}`}>
                          <Clock size={11} />
                          <span className="text-xs">{service.duration_minutes} min</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-bold ${isInactive ? 'text-slate-500' : 'text-slate-800'}`}>
                          ₱{parseFloat(service.price).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                          service.service_status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${service.service_status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {service.service_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenService(service);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'hover:bg-slate-200' : 'hover:bg-pink-50'}`}
                        >
                          <Edit size={14} className={isInactive ? 'text-slate-400' : 'text-pink-500'} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Unified Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh]">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10 overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Scissors size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {isCreatingNew ? 'Add New Service' : `Manage: ${selectedService?.service_name || ''}`}
                  </h2>
                  <p className="text-[11px] text-pink-100">
                    {isCreatingNew ? 'Create a new salon service' : 'Update service details and settings'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedService(null);
                  setIsCreatingNew(false);
                  setSelectedServiceUsages([]);
                  setSelectedHairColorIds([]);
                }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="p-6 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: 'calc(90vh - 76px)' }}
            >
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 mb-4">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN — Main fields + Price Adjustments */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Service Details</h3>

                  <div>
                    <label className="block text-slate-700 text-xs font-semibold mb-1.5">Service Name <span className="text-pink-500">*</span></label>
                    <input
                      type="text"
                      name="service_name"
                      value={formData.service_name}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5">Price (₱) <span className="text-pink-500">*</span></label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5">Duration (min) <span className="text-pink-500">*</span></label>
                      <input
                        type="number"
                        name="duration_minutes"
                        value={formData.duration_minutes}
                        onChange={handleInputChange}
                        step="15"
                        min="15"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-1.5">Status</label>
                      <select
                        name="service_status"
                        value={formData.service_status}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end gap-2 pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="is_multitaskable"
                          checked={formData.is_multitaskable}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_multitaskable: e.target.checked }))}
                          className="w-4 h-4 text-pink-500 border-slate-300 rounded focus:ring-pink-500"
                        />
                        <span className="text-slate-700 text-xs font-semibold">Multi-tasking</span>
                      </label>
                      {isCreatingNew && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="reqHairColor"
                            checked={formData.reqHairColor}
                            onChange={(e) => setFormData(prev => ({ ...prev, reqHairColor: e.target.checked }))}
                            className="w-4 h-4 text-purple-500 border-slate-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-slate-700 text-xs font-semibold">Requires Hair Color</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Price Adjustments</h3>
                      <button
                        type="button"
                        onClick={addPriceAdjustment}
                        className="flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-xs font-semibold border border-pink-100"
                      >
                        <Plus size={12} />
                        Add Row
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.price_adjustments.map((adjustment, index) => (
                        <div key={index} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <select
                              value={adjustment.hair_length}
                              onChange={(e) => updatePriceAdjustment(index, 'hair_length', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            >
                              {hairLengthOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <select
                              value={adjustment.hair_thickness}
                              onChange={(e) => updatePriceAdjustment(index, 'hair_thickness', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                            >
                              {hairThicknessOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-xs font-semibold">₱</span>
                              <input
                                type="number"
                                value={adjustment.additional_price}
                                onChange={(e) => updatePriceAdjustment(index, 'additional_price', e.target.value)}
                                step="0.01"
                                min="0"
                                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePriceAdjustment(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN — Specialties, Products, Hair Colors */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Add Specialty</h3>
                    <select
                      name="specialty_id"
                      value={serviceSpecialtyFormData.specialty_id}
                      onChange={handleServiceSpecialtyChange}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                    >
                      <option value="">Select a specialty...</option>
                      {specialtiesList.map((specialty) => (
                        <option key={specialty.id} value={specialty.id}>
                          {formatSpecialtyName(specialty.specialty_name)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      The specialty decides which staff can be booked for this service
                      (e.g. choose Nail Technician for Nails).
                    </p>
                  </div>

                  {!isCreatingNew && (
                    <div>
                      <label className="block text-slate-700 text-xs font-semibold mb-2">
                        Current Specialties
                      </label>
                      {selectedService?.service_specialties && selectedService.service_specialties.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedService.service_specialties.map((specialtyItem, idx) => {
                            const specialtyName = specialtyItem.specialty?.specialty_name;
                            if (!specialtyName) return null;
                            return (
                              <span
                                key={specialtyItem.id ?? `${specialtyItem.specialty_id}-${idx}`}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-pink-50 text-pink-700 border border-pink-100 rounded-full text-xs font-semibold"
                              >
                                {getSpecialtyIcon(specialtyName)}
                                <span>{formatSpecialtyName(specialtyName)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpecialty(specialtyItem.specialty_id)}
                                  disabled={isRemovingSpecialty}
                                  className="p-0.5 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                  title="Remove specialty"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] italic text-slate-400">No specialties assigned yet.</p>
                      )}
                    </div>
                  )}

                  {!isCreatingNew && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Product Usage</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">{selectedServiceUsages.length} product(s)</span>
                      </div>

                      {isLoadingUsages ? (
                        <div className="flex justify-center py-6">
                          <div className="w-6 h-6 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : selectedServiceUsages.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto mb-3 scrollbar-hide">
                          {selectedServiceUsages.map((usage, index) => (
                            <div key={index} className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                                  <Package size={15} className="text-pink-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {getProductNameFromUsage(usage)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Usage: {usage.estimated_usage} {getProductUnit(usage)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-slate-50 rounded-xl mb-3 border border-slate-100">
                          <Package size={24} className="text-slate-300 mx-auto mb-1" />
                          <p className="text-xs text-slate-500">No products linked</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="relative">
                          <Package size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                            className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                          />
                          <ChevronDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                            onClick={() => setShowProductDropdown(!showProductDropdown)}
                          />

                          {showProductDropdown && filteredProducts.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                              {filteredProducts.map(product => (
                                <div
                                  key={product.id}
                                  onClick={() => handleSelectProduct(product)}
                                  className="px-3 py-2 hover:bg-pink-50 cursor-pointer transition-colors text-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-800">{product.product_name}</span>
                                    <span className="text-xs text-slate-500">{product.unit_size}{product.unit}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <input
                          type="number"
                          name="estimated_usage"
                          value={usageFormData.estimated_usage}
                          onChange={handleUsageInputChange}
                          step="0.01"
                          placeholder="Estimated usage per service"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Hair Colors — only editable during creation, read-only when editing an existing service */}
                  {formData.reqHairColor && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Palette size={14} className="text-purple-500" />
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800">Hair Colors</h3>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            ({selectedHairColorIds.length} selected)
                          </span>
                        </div>
                        {isCreatingNew && (
                          <button
                            type="button"
                            onClick={() => handleOpenHairColorModal()}
                            className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-md transition-all text-[10px] font-semibold shadow-sm shadow-pink-500/25"
                          >
                            <Plus size={12} />
                            Add Color
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mb-3">
                        {isCreatingNew
                          ? 'Select which hair colors customers can choose from for this service.'
                          : 'Hair colors linked to this service (set at creation).'}
                      </p>

                      {hairColors.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                          <Palette size={28} className="text-slate-300 mx-auto mb-1" />
                          <p className="text-xs text-slate-400">No hair colors yet</p>
                          {isCreatingNew && (
                            <button
                              type="button"
                              onClick={() => handleOpenHairColorModal()}
                              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-xs font-semibold"
                            >
                              <Plus size={12} />
                              Add Your First Color
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 scrollbar-hide">
                          {hairColors.map((color) => {
                            const isInactive = color.is_active === 0 || color.is_active === false;
                            const isSelected = selectedHairColorIds.includes(color.id);
                            const isSelectable = isCreatingNew && !isInactive;
                            return (
                              <div
                                key={color.id}
                                className={`relative rounded-xl border p-2.5 transition-all ${
                                  isInactive
                                    ? 'border-slate-200 bg-slate-50 opacity-60'
                                    : isSelected
                                      ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200'
                                      : 'border-slate-200 bg-white hover:border-pink-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => isSelectable && toggleHairColorSelection(color.id)}
                                    disabled={!isSelectable}
                                    className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isSelected ? 'border-pink-500' : 'border-slate-300'
                                    } ${isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                    style={{ backgroundColor: color.color_code || '#808080' }}
                                  >
                                    {isSelected && (
                                      <CheckCircle size={15} className="text-white drop-shadow-md" />
                                    )}
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-800 truncate">
                                      {color.color_name}
                                    </p>
                                    <p className="text-[9px] text-slate-500 font-mono uppercase">
                                      {color.color_code}
                                    </p>
                                  </div>

                                  {isCreatingNew && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenHairColorModal(color)}
                                      className="p-1 rounded-lg hover:bg-pink-100 transition-colors flex-shrink-0"
                                      title="Edit color"
                                    >
                                      <Edit size={12} className="text-pink-500" />
                                    </button>
                                  )}
                                </div>

                                {isInactive && (
                                  <span className="absolute top-1 right-1 text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedHairColorIds.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-2 font-semibold">
                          {selectedHairColorIds.length} color{selectedHairColorIds.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedService(null);
                    setIsCreatingNew(false);
                    setSelectedServiceUsages([]);
                    setSelectedHairColorIds([]);
                  }}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllChanges}
                  disabled={isSavingAll}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingAll ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      {isCreatingNew ? 'Create Service' : 'Save Changes'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hair Color Modal */}
      {showHairColorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="relative bg-gradient-to-r from-pink-500 to-fuchsia-600 px-6 py-4 flex items-center justify-between overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Palette size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingHairColor ? 'Edit Hair Color' : 'Add Hair Color'}
                  </h2>
                  <p className="text-[11px] text-pink-100">
                    {editingHairColor ? 'Update color details' : 'Create a new hair color option'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHairColorModal(false);
                  setEditingHairColor(null);
                }}
                className="relative text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHairColor} className="p-6 space-y-4">
              {hairColorError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{hairColorError}</p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5">Color Name <span className="text-pink-500">*</span></label>
                <input
                  type="text"
                  value={hairColorForm.color_name}
                  onChange={(e) => setHairColorForm(prev => ({ ...prev, color_name: e.target.value }))}
                  placeholder="e.g. Ash Blonde, Burgundy"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent transition-all"
                  disabled={isSavingHairColor}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5">Color Code <span className="text-pink-500">*</span></label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hairColorForm.color_code}
                    onChange={(e) => setHairColorForm(prev => ({ ...prev, color_code: e.target.value.toUpperCase() }))}
                    className="w-12 h-11 rounded-xl border border-slate-200 cursor-pointer"
                    disabled={isSavingHairColor}
                  />
                  <input
                    type="text"
                    value={hairColorForm.color_code}
                    onChange={(e) => setHairColorForm(prev => ({ ...prev, color_code: e.target.value.toUpperCase() }))}
                    placeholder="#000000"
                    maxLength={7}
                    className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white focus:border-transparent font-mono transition-all"
                    disabled={isSavingHairColor}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-semibold mb-1.5">Preview</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div
                    className="w-11 h-11 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: hairColorForm.color_code }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {hairColorForm.color_name || 'Untitled Color'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{hairColorForm.color_code}</p>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hairColorForm.is_active}
                  onChange={(e) => setHairColorForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-pink-500 border-slate-300 rounded focus:ring-pink-500"
                  disabled={isSavingHairColor}
                />
                <span className="text-slate-700 text-sm font-semibold">Mark as active</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHairColorModal(false);
                    setEditingHairColor(null);
                  }}
                  disabled={isSavingHairColor}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHairColor}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingHairColor ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Palette size={15} />
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
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Scissors size={28} className="text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">
            {statusFilter === 'inactive'
              ? 'No inactive services found'
              : statusFilter === 'active'
                ? 'No active services found'
                : 'No services found'}
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            {searchTerm
              ? 'Try adjusting your search terms'
              : statusFilter === 'inactive'
                ? 'All services are currently active'
                : 'Click "Add Service" to create your first service'}
          </p>
          {!searchTerm && statusFilter !== 'inactive' && (
            <button
              onClick={handleAddNewService}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl shadow-md shadow-pink-500/25 hover:shadow-lg transition-all text-sm font-semibold"
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