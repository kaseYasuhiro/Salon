import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

interface ProductUsage {
  id: number;
  product_id: number;
  product_name: string;
  estimated_usage: number;
  inventory_id: number | null;
  current_quantity: number;
  current_usages: number;
  quantity_change: number;
}

interface Appointment {
  id: number;
  service_id?: number;
  customer_name: string;
  customer_phone?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  service_status: string;
  service_name: string;
  duration_minutes: number;
  price: string;
  notes?: string;
  transaction_id: number;
}

interface WalkIn {
  id: number;
  customer_name: string;
  service_id: number;
  stylist_id: number;
  amount_paid: number;
  is_finished: number;
  created_at: string;
  updated_at: string;
  services?: {
    id: number;
    service_name: string;
    description: string;
    price: string;
    duration_minutes: number;
    is_multitaskable: number;
    service_status: string;
    created_at: string;
    updated_at: string;
  };
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_image: string | null;
    email: string;
    email_verified_at: string | null;
    phone_number: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
}

// Combined item for display
interface DisplayItem {
  id: number;
  service_id?: number;
  customer_name: string;
  customer_phone?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  service_status: string;
  service_name: string;
  duration_minutes: number;
  price: string;
  notes?: string;
  transaction_id: number;
  is_walk_in: boolean;
  walk_in_data?: WalkIn;
  stylist_name?: string;
  created_at?: string;
}

// Interfaces for business schedule and staff assignment
interface BusinessSchedule {
  id: number;
  business_date: string;
  open_time: string;
  close_time: string;
  is_open: number;
}

interface StaffAssignment {
  id: number;
  staff_id: number;
  business_date_id: number;
}

interface StaffAppointmentsProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function StaffAppointments({ 
  refreshing, 
  onRefresh
}: StaffAppointmentsProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showWalkInUpdateModal, setShowWalkInUpdateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [productUsages, setProductUsages] = useState<ProductUsage[]>([]);
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
    service_status: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'walkins'>('all');
  const [isUpdatingWalkIn, setIsUpdatingWalkIn] = useState(false);
  
  // Walk-in update form state
  const [walkInUpdateData, setWalkInUpdateData] = useState({
    customer_name: '',
    amount_paid: 0,
    is_finished: 0
  });
  
  // Walk-in product usage state
  const [walkInProductUsages, setWalkInProductUsages] = useState<ProductUsage[]>([]);
  
  // Local state for data
  const [staffAppointments, setStaffAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [walkInTransactions, setWalkInTransactions] = useState<any[]>([]);
  
  const { 
    user,
  } = useAuth();

  // States for business schedules and staff assignments
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);

  // Fetch staff appointments
  const fetchStaffAppointments = async () => {
    try {
      const userData = user;
      if (!userData?.id) {
        console.log("No user ID found");
        return [];
      }
      
      const response = await api.get(`/staff/${userData.id}/appointments`);
      console.log("Staff appointments response:", response.data);
      
      let appointmentsData: Appointment[] = [];
      if (Array.isArray(response.data)) {
        appointmentsData = response.data.map((item: any) => ({
          id: item.id,
          service_id: item.service_id,
          customer_name: item.customer_name || 'Walk-in Customer',
          customer_phone: item.customer_phone || 'N/A',
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time || '--:--',
          status: item.status,
          service_status: item.service_status,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price,
          notes: item.notes,
          transaction_id: item.transaction_id
        }));
      }
      
      console.log("Processed staff appointments:", appointmentsData);
      setStaffAppointments(appointmentsData);
      return appointmentsData;
    } catch (error) {
      console.log("Error fetching staff appointments:", error);
      return [];
    }
  };

  // Fetch staff
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      console.log("Fetched staff with specialties:", response.data);
      
      let staffData: any[] = [];
      if (Array.isArray(response.data)) {
        staffData = response.data;
      }
      
      setStaff(staffData);
      return staffData;
    } catch (error) {
      console.log("Error fetching staff:", error);
      return [];
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      console.log("Fetched services:", response.data);
      
      let servicesData: any[] = [];
      if (Array.isArray(response.data)) {
        servicesData = response.data.map((service: any) => ({
          id: service.id,
          service_name: service.service_name,
          description: service.description,
          price: parseFloat(service.price),
          is_multitaskable: service.is_multitaskable,
          duration_minutes: service.duration_minutes,
          service_status: service.service_status,
          created_at: service.created_at,
          updated_at: service.updated_at,
        }));
      }
      
      setServices(servicesData);
      return servicesData;
    } catch (error) {
      console.log("Error fetching services:", error);
      return [];
    }
  };

  // Fetch walk-ins
  const fetchWalkIns = async () => {
    try {
      const response = await api.get('/walk-in');
      console.log('Fetched walk-ins:', response.data);
      
      let walkInsData: WalkIn[] = [];
      if (Array.isArray(response.data)) {
        walkInsData = response.data.map((item: any) => ({
          id: item.id,
          customer_name: item.customer_name,
          service_id: item.service_id,
          stylist_id: item.stylist_id,
          amount_paid: item.amount_paid || 0,
          is_finished: item.is_finished,
          created_at: item.created_at,
          updated_at: item.updated_at,
          services: item.services,
          user: item.user
        }));
      }
      
      console.log('Processed walk-ins:', walkInsData);
      setWalkIns(walkInsData);
      return walkInsData;
    } catch (error) {
      console.error('Error fetching walk-ins:', error);
      return [];
    }
  };

  // Update walk-in
  const updateWalkIn = async (id: number, data: any) => {
    try {
      const response = await api.post(`/walk-in/update/${id}`, {
        customer_name: data.customer_name,
        service_id: data.service_id,
        stylist_id: data.stylist_id,
        amount_paid: data.amount_paid,
        is_finished: data.is_finished
      });
      console.log('Walk-in updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating walk-in:', error);
      throw error;
    }
  };

  // Fetch walk-in transactions
  const fetchWalkInTransactions = async () => {
    try {
      const response = await api.get('/walk-in/transaction');
      console.log('Fetched walk-in transactions:', response.data);
      
      let transactionsData: any[] = [];
      if (Array.isArray(response.data)) {
        transactionsData = response.data.map((item: any) => ({
          id: item.id,
          walkin_id: item.walkin_id,
          inventory_id: item.inventory_id,
          quantity_change: item.quantity_change,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
      }
      
      console.log('Processed walk-in transactions:', transactionsData);
      setWalkInTransactions(transactionsData);
      return transactionsData;
    } catch (error) {
      console.error('Error fetching walk-in transactions:', error);
      return [];
    }
  };

  // Submit walk-in transaction
  const submitWalkInTransaction = async (data: { walkin_id: number; inventory_id: number; quantity_change: number }) => {
    try {
      const response = await api.post('/walk-in/transaction/add', {
        walkin_id: data.walkin_id,
        inventory_id: data.inventory_id,
        quantity_change: data.quantity_change
      });
      console.log('Walk-in transaction submitted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting walk-in transaction:', error);
      throw error;
    }
  };

  // Update service with inventory
  const updateServiceWithInventory = async (transactionId: number, data: any) => {
    try {
      const response = await api.put(`/staff/transaction/${transactionId}/update`, data);
      console.log("Service updated:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error updating service:", error);
      throw error;
    }
  };

  // Fetch business schedules
  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching business schedules:', error);
    }
  };

  // Fetch staff assignments
  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      if (Array.isArray(response.data)) {
        setStaffAssignments(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    }
  };

  // Get UTC date string from Date object
  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get staff assigned to today
  const getTodayStaff = useCallback(() => {
    const todayStr = getUTCDateString(new Date());
    const schedule = businessSchedules.find(s => s.business_date === todayStr);
    if (!schedule) return [];
    
    const assignments = staffAssignments.filter(a => a.business_date_id === schedule.id);
    const staffIds = assignments.map(a => a.staff_id);
    return staff.filter(s => staffIds.includes(s.id));
  }, [businessSchedules, staffAssignments, staff]);

  const fetchProductUsagesForService = async (serviceId: number) => {
    try {
      console.log("Fetching product usages for service ID:", serviceId);
      const response = await api.get(`/service/${serviceId}/product-usages`);
      console.log("Product usages response:", response.data);
      
      if (Array.isArray(response.data)) {
        const usages = response.data.map((usage: any) => ({
          id: usage.id,
          product_id: usage.product_id,
          product_name: usage.product_name,
          estimated_usage: usage.estimated_usage,
          inventory_id: usage.inventory_id,
          current_quantity: usage.current_quantity,
          current_usages: usage.current_usages,
          quantity_change: 0
        }));
        return usages;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching product usages:", error);
      Alert.alert("Error", "Failed to load product information");
      return [];
    }
  };

  const handleOpenUpdateModal = async (item: DisplayItem) => {
    // If it's a walk-in, open the walk-in update modal instead
    if (item.is_walk_in && item.walk_in_data) {
      setSelectedWalkIn(item.walk_in_data);
      // Populate the walk-in update form with current data
      setWalkInUpdateData({
        customer_name: item.customer_name,
        amount_paid: item.walk_in_data.amount_paid || 0,
        is_finished: item.walk_in_data.is_finished
      });
      
      // Fetch product usages for the walk-in's service
      if (item.service_id) {
        const usages = await fetchProductUsagesForService(item.service_id);
        setWalkInProductUsages(usages);
      } else {
        setWalkInProductUsages([]);
      }
      
      setShowWalkInUpdateModal(true);
      return;
    }
    
    // Regular appointment
    console.log("Full appointment data:", item);
    console.log("Service ID:", item.service_id);
    
    // Find the original appointment from staffAppointments
    const appointment = staffAppointments.find(a => a.id === item.id);
    if (!appointment) {
      Alert.alert("Error", "Appointment not found");
      return;
    }
    
    setSelectedAppointment(appointment);
    setUpdateFormData({
      status: appointment.status,
      service_status: appointment.service_status,
      notes: appointment.notes || ''
    });
    
    if (appointment.service_id) {
      console.log("Fetching product usages for service ID:", appointment.service_id);
      const usages = await fetchProductUsagesForService(appointment.service_id);
      setProductUsages(usages);
    } else {
      console.log("No service_id found in appointment");
      setProductUsages([]);
    }
    
    setShowUpdateModal(true);
  };

  const handleProductQuantityChange = (index: number, value: string) => {
    const updatedUsages = [...productUsages];
    const numericValue = parseInt(value) || 0;
    updatedUsages[index].quantity_change = numericValue;
    setProductUsages(updatedUsages);
  };

  const handleWalkInProductQuantityChange = (index: number, value: string) => {
    const updatedUsages = [...walkInProductUsages];
    const numericValue = parseInt(value) || 0;
    updatedUsages[index].quantity_change = numericValue;
    setWalkInProductUsages(updatedUsages);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedAppointment) return;
    
    for (const product of productUsages) {
      if (product.quantity_change > 0 && product.inventory_id) {
        const availableUsages = (product.current_quantity * product.estimated_usage) - product.current_usages;
        if (product.quantity_change > availableUsages && availableUsages > 0) {
          Alert.alert(
            "Insufficient Stock",
            `Not enough ${product.product_name} available. Available: ${availableUsages} units`
          );
          return;
        }
      }
    }
    
    setIsUpdating(true);
    try {
      const updateData = {
        status: updateFormData.status,
        service_status: updateFormData.service_status,
        notes: updateFormData.notes,
        product_usages: productUsages
          .filter(p => p.quantity_change > 0 && p.inventory_id)
          .map(p => ({
            inventory_id: p.inventory_id,
            quantity_change: p.quantity_change
          }))
      };
      
      console.log("Updating with data:", updateData);
      
      await updateServiceWithInventory(selectedAppointment.transaction_id, updateData);
      
      Alert.alert("Success", "Service updated successfully!");
      setShowUpdateModal(false);
      setSelectedAppointment(null);
      await fetchStaffAppointments();
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update service");
    } finally {
      setIsUpdating(false);
    }
  };

  // Walk-in Update functions
  const handleWalkInUpdate = async () => {
    if (!selectedWalkIn) return;
    
    // Validate form
    if (!walkInUpdateData.customer_name.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
      return;
    }
    
    // Validate product usages
    for (const product of walkInProductUsages) {
      if (product.quantity_change > 0 && product.inventory_id) {
        const availableUsages = (product.current_quantity * product.estimated_usage) - product.current_usages;
        if (product.quantity_change > availableUsages && availableUsages > 0) {
          Alert.alert(
            "Insufficient Stock",
            `Not enough ${product.product_name} available. Available: ${availableUsages} units`
          );
          return;
        }
      }
    }
    
    setIsUpdatingWalkIn(true);
    try {
      // Update walk-in details - include service_id and stylist_id from the existing walk-in
      const updateData = {
        customer_name: walkInUpdateData.customer_name.trim(),
        service_id: selectedWalkIn.service_id,
        stylist_id: selectedWalkIn.stylist_id,
        amount_paid: walkInUpdateData.amount_paid,
        is_finished: walkInUpdateData.is_finished
      };
      
      console.log("Updating walk-in:", selectedWalkIn.id, updateData);
      await updateWalkIn(selectedWalkIn.id, updateData);
      
      // Submit walk-in transactions for product usages
      const transactions = walkInProductUsages
        .filter(p => p.quantity_change > 0 && p.inventory_id)
        .map(p => ({
          walkin_id: selectedWalkIn.id,
          inventory_id: p.inventory_id!,
          quantity_change: p.quantity_change
        }));
      
      if (transactions.length > 0) {
        console.log("Submitting walk-in transactions:", transactions);
        for (const transaction of transactions) {
          await submitWalkInTransaction(transaction);
        }
      }
      
      Alert.alert("Success", "Walk-in customer updated successfully!");
      setShowWalkInUpdateModal(false);
      setSelectedWalkIn(null);
      setWalkInProductUsages([]);
      await Promise.all([fetchStaffAppointments(), fetchWalkIns(), fetchWalkInTransactions(), fetchStaffAssignments()]);
    } catch (error: any) {
      console.error("Error updating walk-in:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update walk-in customer");
    } finally {
      setIsUpdatingWalkIn(false);
    }
  };

  // Get combined items (appointments + walk-ins) for display
  const getDisplayItems = (): DisplayItem[] => {
    const currentStaffId = user?.id;
    
    console.log("=== DEBUG: Getting display items ===");
    console.log("Current staff ID:", currentStaffId);
    console.log("Staff appointments:", staffAppointments.length);
    console.log("Walk-ins:", walkIns.length);
    
    // Map regular appointments
    const appointmentItems: DisplayItem[] = staffAppointments.map(app => ({
      ...app,
      is_walk_in: false,
      walk_in_data: undefined,
      created_at: app.appointment_date
    }));
    
    // Filter walk-ins to only show those assigned to the current staff member
    const filteredWalkIns = walkIns.filter((walkIn: WalkIn) => {
      const matches = walkIn.stylist_id === currentStaffId;
      console.log(`Walk-in ${walkIn.id} - stylist_id: ${walkIn.stylist_id}, matches: ${matches}`);
      return matches;
    });
    
    // Map walk-ins to display items
    const walkInItems: DisplayItem[] = filteredWalkIns.map((walkIn: WalkIn) => {
      const isFinished = walkIn.is_finished === 1;
      const serviceStatus = isFinished ? 'completed' : 'pending';
      
      // Get stylist name from user object
      const stylistName = walkIn.user 
        ? `${walkIn.user.first_name || ''} ${walkIn.user.last_name || ''}`.trim() 
        : 'Unknown Stylist';
      
      return {
        id: walkIn.id,
        service_id: walkIn.service_id,
        customer_name: walkIn.customer_name || 'Walk-in Customer',
        customer_phone: undefined,
        appointment_date: walkIn.created_at ? walkIn.created_at.split('T')[0] : undefined,
        appointment_time: walkIn.created_at ? walkIn.created_at.split('T')[1]?.slice(0, 5) : undefined,
        status: isFinished ? 'completed' : 'pending',
        service_status: serviceStatus,
        service_name: walkIn.services?.service_name || 'Unknown Service',
        duration_minutes: walkIn.services?.duration_minutes || 0,
        price: walkIn.services?.price?.toString() || '0',
        notes: 'Walk-in customer',
        transaction_id: walkIn.id,
        is_walk_in: true,
        walk_in_data: walkIn,
        stylist_name: stylistName,
        created_at: walkIn.created_at
      };
    });

    console.log("Appointment items:", appointmentItems.length);
    console.log("Walk-in items:", walkInItems.length);
    console.log("=== END DEBUG ===");

    return [...appointmentItems, ...walkInItems];
  };

  // Filter items by tab
  const getFilteredItems = () => {
    const all = getDisplayItems();
    
    switch (activeTab) {
      case 'appointments':
        return all.filter(item => !item.is_walk_in);
      case 'walkins':
        return all.filter(item => item.is_walk_in);
      default:
        return all;
    }
  };

  // Filter items by date category
  const getItemsByDate = (items: DisplayItem[]) => {
    const today = getUTCDateString(new Date());
    
    const todayItems: DisplayItem[] = [];
    const upcomingItems: DisplayItem[] = [];
    const pastItems: DisplayItem[] = [];
    
    items.forEach(item => {
      const dateToCheck = item.appointment_date || (item.walk_in_data?.created_at?.split('T')[0]) || item.created_at?.split('T')[0];
      
      if (!dateToCheck) {
        pastItems.push(item);
      } else if (dateToCheck === today) {
        todayItems.push(item);
      } else if (dateToCheck > today) {
        upcomingItems.push(item);
      } else {
        pastItems.push(item);
      }
    });
    
    return { todayItems, upcomingItems, pastItems };
  };

  // Get counts for tabs
  const getAllCount = () => {
    const all = getDisplayItems();
    return all.length;
  };

  const getAppointmentsCount = () => {
    const all = getDisplayItems();
    return all.filter(item => !item.is_walk_in).length;
  };

  const getWalkInsCount = () => {
    const all = getDisplayItems();
    return all.filter(item => item.is_walk_in).length;
  };

  const renderItemCard = (item: DisplayItem) => {
    const isCompleted = item.service_status === 'completed' || item.status === 'completed';
    const isWalkIn = item.is_walk_in;
    
    const stylistName = isWalkIn && item.walk_in_data?.user 
      ? `${item.walk_in_data.user.first_name || ''} ${item.walk_in_data.user.last_name || ''}`.trim()
      : item.stylist_name || '';
    
    return (
      <View key={`${item.id}-${item.is_walk_in ? 'walkin' : 'appointment'}`} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className={`p-2 rounded-full mr-3 ${isWalkIn ? 'bg-green-100' : 'bg-pink-100'}`}>
                <Ionicons name={isWalkIn ? "walk-outline" : "person-outline"} size={20} color={isWalkIn ? "#16a34a" : "#ec4899"} />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text className="text-gray-800 font-bold text-lg">
                    {item.customer_name}
                  </Text>
                  {isWalkIn && (
                    <View className="ml-2 bg-green-100 px-2 py-0.5 rounded-full">
                      <Text className="text-green-700 text-xs font-semibold">Walk-in</Text>
                    </View>
                  )}
                </View>
                {stylistName && (
                  <Text className="text-gray-500 text-xs">Stylist: {stylistName}</Text>
                )}
                {isWalkIn && item.walk_in_data?.created_at && (
                  <Text className="text-gray-400 text-xs">
                    Created: {formatDate(item.walk_in_data.created_at)}
                  </Text>
                )}
                {isWalkIn && item.walk_in_data?.amount_paid !== undefined && item.walk_in_data?.amount_paid !== null && (
                  <Text className="text-green-600 text-xs">
                    Paid: ₱{item.walk_in_data.amount_paid.toLocaleString()}
                  </Text>
                )}
              </View>
            </View>
            
            <View className="flex-row items-center mt-1">
              <Ionicons name="cut-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-600 text-sm ml-1">{item.service_name}</Text>
            </View>
            
            <View className="flex-row items-center mt-1">
              <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">{item.duration_minutes} mins</Text>
            </View>
            
            {item.notes && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="document-text-outline" size={12} color="#9ca3af" />
                <Text className="text-gray-400 text-xs italic" numberOfLines={1}>{item.notes}</Text>
              </View>
            )}
          </View>
          
          <View className={`px-3 py-1.5 rounded-full ${
            item.service_status === 'completed' ? 'bg-green-100' :
            item.service_status === 'in_progress' ? 'bg-blue-100' : 'bg-pink-100'
          }`}>
            <Text className={`text-xs font-semibold ${
              item.service_status === 'in_progress' ? 'text-blue-700' :
              item.service_status === 'completed' ? 'text-green-700' : 'text-pink-700'
            }`}>
              {item.service_status === 'in_progress' ? 'IN PROGRESS' : 
               item.service_status === 'completed' ? 'COMPLETED' : 
               item.service_status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>
        
        <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
          <Text className="text-pink-500 font-bold text-lg">₱{parseFloat(item.price).toLocaleString()}</Text>
          
          {!isCompleted && (
            <TouchableOpacity 
              className="bg-blue-600 px-5 py-2 rounded-xl"
              onPress={() => handleOpenUpdateModal(item)}
            >
              <Text className="text-white font-semibold text-sm">Update</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const filteredItems = getFilteredItems();
  const { todayItems, upcomingItems, pastItems } = getItemsByDate(filteredItems);

  // Get today's staff for the stylist selection
  const todayStaff = getTodayStaff();

  // Load data on mount
  useEffect(() => {
    fetchBusinessSchedules();
    fetchStaffAssignments();
    fetchStaff();
    fetchServices();
    fetchStaffAppointments();
    fetchWalkIns();
    fetchWalkInTransactions();
  }, []);

  return (
    <>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
        }
      >
        <View className="px-5 pt-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-3xl font-bold text-gray-800">My Appointments</Text>
          </View>
          <Text className="text-gray-500 mb-4">All your assigned appointments</Text>
          
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg ${
                activeTab === 'all' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('all')}
            >
              <Text className={`text-center font-semibold ${
                activeTab === 'all' ? 'text-pink-600' : 'text-gray-600'
              }`}>
                All ({getAllCount()})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg ${
                activeTab === 'appointments' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('appointments')}
            >
              <Text className={`text-center font-semibold ${
                activeTab === 'appointments' ? 'text-pink-600' : 'text-gray-600'
              }`}>
                Appointments ({getAppointmentsCount()})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg ${
                activeTab === 'walkins' ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setActiveTab('walkins')}
            >
              <Text className={`text-center font-semibold ${
                activeTab === 'walkins' ? 'text-pink-600' : 'text-gray-600'
              }`}>
                Walk-ins ({getWalkInsCount()})
              </Text>
            </TouchableOpacity>
          </View>
          
          {todayItems.length > 0 && (
            <>
              <Text className="text-lg font-bold text-gray-800 mb-3">Today</Text>
              {todayItems.map(renderItemCard)}
            </>
          )}
          
          {upcomingItems.length > 0 && (
            <>
              <Text className="text-lg font-bold text-gray-800 mt-4 mb-3">Upcoming</Text>
              {upcomingItems.map(renderItemCard)}
            </>
          )}
          
          {pastItems.length > 0 && (
            <>
              <Text className="text-lg font-bold text-gray-800 mt-4 mb-3">Past</Text>
              {pastItems.map(renderItemCard)}
            </>
          )}
          
          {filteredItems.length === 0 && (
            <View className="bg-white rounded-2xl p-12 items-center">
              <Ionicons name="calendar-outline" size={60} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-center">
                {activeTab === 'walkins' 
                  ? 'No walk-in customers yet' 
                  : activeTab === 'appointments' 
                    ? 'No appointments assigned yet'
                    : 'No appointments or walk-ins yet'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Update Modal for Regular Appointments */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUpdateModal}
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90%] overflow-hidden">
            <View className="bg-pink-500 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Update Service</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-6">
              <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-500 text-sm">Customer</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.customer_name}</Text>
                <Text className="text-gray-500 text-sm mt-2">Service</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.service_name}</Text>
                <Text className="text-gray-500 text-sm mt-2">Service ID</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.service_id || 'Not available'}</Text>
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Appointment Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setUpdateFormData(prev => ({ ...prev, status }))}
                      className={`px-4 py-2 rounded-full ${
                        updateFormData.status === status 
                          ? 'bg-pink-500' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`capitalize ${updateFormData.status === status ? 'text-white' : 'text-gray-700'}`}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Service Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setUpdateFormData(prev => ({ ...prev, service_status: status }))}
                      className={`px-4 py-2 rounded-full ${
                        updateFormData.service_status === status 
                          ? 'bg-pink-500' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`capitalize ${updateFormData.service_status === status ? 'text-white' : 'text-gray-700'}`}>
                        {status === 'in_progress' ? 'In Progress' : status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Notes</Text>
                <TextInput
                  value={updateFormData.notes}
                  onChangeText={(text) => setUpdateFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Add notes about this appointment..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[80px]"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Product Usage</Text>
                <Text className="text-gray-500 text-sm mb-3">Update quantity used for each product</Text>
                
                {productUsages.length === 0 ? (
                  <View className="bg-yellow-50 rounded-xl p-4">
                    <Text className="text-yellow-600 text-sm text-center">
                      No products configured for this service
                    </Text>
                  </View>
                ) : (
                  productUsages.map((product, index) => (
                    <View key={product.id} className="bg-gray-50 rounded-xl p-3 mb-3">
                      <Text className="text-gray-800 font-semibold">{product.product_name}</Text>
                      <Text className="text-gray-500 text-xs mb-2">
                        Estimated Usage: {product.estimated_usage} per service
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-gray-600">Quantity Used:</Text>
                        <TextInput
                          value={product.quantity_change.toString()}
                          onChangeText={(value) => handleProductQuantityChange(index, value)}
                          keyboardType="numeric"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-center"
                          placeholder="0"
                        />
                        <Text className="text-gray-600">units</Text>
                      </View>
                      <Text className="text-gray-400 text-xs mt-2">
                        Available Stock: {product.current_quantity} units
                      </Text>
                    </View>
                  ))
                )}
              </View>
              
              <TouchableOpacity
                onPress={handleUpdateSubmit}
                disabled={isUpdating}
                className="bg-pink-500 py-3 rounded-xl mt-4"
              >
                <Text className="text-white text-center font-semibold">
                  {isUpdating ? 'Updating...' : 'Update Service'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Walk-in Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showWalkInUpdateModal}
        onRequestClose={() => setShowWalkInUpdateModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90%] overflow-hidden">
            <View className="bg-green-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Update Walk-in</Text>
              <TouchableOpacity onPress={() => setShowWalkInUpdateModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-6">
              {/* Customer Info Display */}
              <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-500 text-sm">Current Walk-in Details</Text>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-gray-600 text-sm">Customer:</Text>
                  <Text className="text-gray-800 font-semibold">{selectedWalkIn?.customer_name}</Text>
                </View>
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-gray-600 text-sm">Service:</Text>
                  <Text className="text-gray-800 font-semibold">{selectedWalkIn?.services?.service_name || 'Unknown'}</Text>
                </View>
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-gray-600 text-sm">Stylist:</Text>
                  <Text className="text-gray-800 font-semibold">
                    {selectedWalkIn?.user?.first_name} {selectedWalkIn?.user?.last_name}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-gray-600 text-sm">Status:</Text>
                  <View className={`px-2 py-0.5 rounded-full ${
                    selectedWalkIn?.is_finished === 1 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      selectedWalkIn?.is_finished === 1 ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {selectedWalkIn?.is_finished === 1 ? 'FINISHED' : 'PENDING'}
                    </Text>
                  </View>
                </View>
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-gray-600 text-sm">Amount Paid:</Text>
                  <Text className="text-green-600 font-semibold">
                    ₱{selectedWalkIn?.amount_paid?.toLocaleString() || '0.00'}
                  </Text>
                </View>
              </View>

              {/* Customer Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Customer Name *</Text>
                <TextInput
                  value={walkInUpdateData.customer_name}
                  onChangeText={(text) => setWalkInUpdateData(prev => ({ ...prev, customer_name: text }))}
                  placeholder="Enter customer name"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-700"
                />
              </View>

              {/* Amount Paid */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Amount Paid *</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <Text className="text-gray-800 font-bold text-lg mr-2">₱</Text>
                  <TextInput
                    value={walkInUpdateData.amount_paid.toString()}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      setWalkInUpdateData(prev => ({ ...prev, amount_paid: num }));
                    }}
                    keyboardType="numeric"
                    className="flex-1 text-lg text-gray-800"
                    placeholder="0.00"
                  />
                </View>
                <Text className="text-gray-400 text-xs mt-1">Enter the amount paid by the customer</Text>
              </View>

              {/* Status Toggle */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Status</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setWalkInUpdateData(prev => ({ ...prev, is_finished: 0 }))}
                    className={`flex-1 py-3 rounded-xl ${
                      walkInUpdateData.is_finished === 0 ? 'bg-yellow-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-semibold ${
                      walkInUpdateData.is_finished === 0 ? 'text-white' : 'text-gray-700'
                    }`}>
                      Pending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setWalkInUpdateData(prev => ({ ...prev, is_finished: 1 }))}
                    className={`flex-1 py-3 rounded-xl ${
                      walkInUpdateData.is_finished === 1 ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text className={`text-center font-semibold ${
                      walkInUpdateData.is_finished === 1 ? 'text-white' : 'text-gray-700'
                    }`}>
                      Finished
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Product Usage Section */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Product Usage</Text>
                <Text className="text-gray-500 text-sm mb-3">Update quantity used for each product</Text>
                
                {walkInProductUsages.length === 0 ? (
                  <View className="bg-yellow-50 rounded-xl p-4">
                    <Text className="text-yellow-600 text-sm text-center">
                      No products configured for this service
                    </Text>
                  </View>
                ) : (
                  walkInProductUsages.map((product, index) => (
                    <View key={product.id} className="bg-gray-50 rounded-xl p-3 mb-3">
                      <Text className="text-gray-800 font-semibold">{product.product_name}</Text>
                      <Text className="text-gray-500 text-xs mb-2">
                        Estimated Usage: {product.estimated_usage} per service
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-gray-600">Quantity Used:</Text>
                        <TextInput
                          value={product.quantity_change.toString()}
                          onChangeText={(value) => handleWalkInProductQuantityChange(index, value)}
                          keyboardType="numeric"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-center"
                          placeholder="0"
                        />
                        <Text className="text-gray-600">units</Text>
                      </View>
                      <Text className="text-gray-400 text-xs mt-2">
                        Available Stock: {product.current_quantity} units
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Selected Summary */}
              <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-600 text-sm font-semibold mb-1">Updated Summary</Text>
                <Text className="text-gray-600 text-sm">
                  Customer: {walkInUpdateData.customer_name || 'Not set'}
                </Text>
                <Text className="text-gray-600 text-sm">
                  Amount Paid: ₱{walkInUpdateData.amount_paid.toLocaleString()}
                </Text>
                <Text className="text-gray-600 text-sm">
                  Status: {walkInUpdateData.is_finished === 1 ? '✅ Finished' : '⏳ Pending'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowWalkInUpdateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-300"
                >
                  <Text className="text-gray-600 text-center font-semibold">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleWalkInUpdate}
                  disabled={isUpdatingWalkIn}
                  className="flex-1 py-3 rounded-xl bg-green-600"
                >
                  <Text className="text-white text-center font-semibold">
                    {isUpdatingWalkIn ? 'Updating...' : 'Update Walk-in'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}