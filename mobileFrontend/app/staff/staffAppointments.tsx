import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, TextInput, Image } from "react-native";
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
  service_id?: number;
  service_name?: string;
}

interface ServiceTransaction {
  id: number;
  service_id: number;
  service_name: string;
  duration_minutes: number;
  price: string;
  service_status: string;
  notes?: string;
  transaction_id: number;
  hair_length?: string | null;
  hair_thickness?: string | null;
  preferred_color?: string | null;
  completed_at?: string | null;
}

interface Appointment {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  // Grouped fields
  services: ServiceTransaction[];
  service_names: string[];
  total_price: number;
  total_duration: number;
  // For backward compatibility
  service_name?: string;
  duration_minutes?: number;
  price?: string;
  notes?: string;
  transaction_id?: number;
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
  hair_length?: string;
  hair_thickness?: string;
  preferred_color?: string;
}

// Combined item for display
interface DisplayItem {
  id: number;
  customer_name: string;
  customer_phone?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  // Grouped fields
  services: ServiceTransaction[];
  service_names: string[];
  total_price: number;
  total_duration: number;
  notes?: string;
  transaction_id?: number;
  is_walk_in: boolean;
  walk_in_data?: WalkIn;
  stylist_name?: string;
  created_at?: string;
  // For backward compatibility
  service_name?: string;
  duration_minutes?: number;
  price?: string;
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

// Payment Data Interface
interface PaymentData {
  id: number;
  billing_id: number;
  payment_method: string;
  payment_proof: string | null;
  created_at: string;
  updated_at: string;
  billing?: {
    id: number;
    appointment_id: number;
    total_amount: string;
    payment_type: string;
    created_at: string;
    updated_at: string;
  };
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
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [selectedPaymentData, setSelectedPaymentData] = useState<PaymentData | null>(null);
  const [productUsages, setProductUsages] = useState<ProductUsage[]>([]);
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
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

  // Update appointment services (all transactions for an appointment)
  const updateAppointmentServices = async (appointmentId: number, data: any) => {
    try {
      const response = await api.put(`/staff/appointment/${appointmentId}/update`, data);
      console.log("Appointment updated:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error updating appointment:", error);
      throw error;
    }
  };

  // Fetch staff appointments from the updated backend function
  const fetchStaffAppointments = async () => {
    try {
      const userData = user;
      if (!userData?.id) {
        console.log("No user ID found");
        return [];
      }
      
      const response = await api.get(`/staff/${userData.id}/appointments`);
      console.log("Staff appointments response:", response.data);
      
      let transactions: any[] = [];
      if (Array.isArray(response.data)) {
        transactions = response.data;
      }
      
      console.log("Processed transactions:", transactions);
      
      // Group transactions by appointment_id
      const appointmentMap = new Map<number, {
        id: number;
        customer_id: number;
        customer_name: string;
        customer_phone?: string;
        appointment_date?: string;
        appointment_time?: string;
        status: string;
        services: ServiceTransaction[];
      }>();
      
      transactions.forEach((item: any) => {
        const appointmentId = item.id;
        
        if (!appointmentMap.has(appointmentId)) {
          // Create a new appointment entry with the appointment status
          appointmentMap.set(appointmentId, {
            id: appointmentId,
            customer_id: item.customer_id || 0,
            customer_name: item.customer_name || 'Walk-in Customer',
            customer_phone: item.customer_phone || 'N/A',
            appointment_date: item.appointment_date,
            appointment_time: item.appointment_time || '--:--',
            status: item.status || 'pending', // Use the appointment's status
            services: []
          });
        }
        
        // Add the service to the appointment with hair details from the transaction
        const appointment = appointmentMap.get(appointmentId)!;
        appointment.services.push({
          id: item.transaction_id || item.id,
          service_id: item.service_id,
          service_name: item.service_name || 'Unknown Service',
          duration_minutes: item.duration_minutes || 0,
          price: item.price || '0',
          service_status: item.service_status || 'pending',
          notes: item.notes || '',
          transaction_id: item.transaction_id || item.id,
          hair_length: item.hair_length || '',
          hair_thickness: item.hair_thickness || '',
          preferred_color: item.preferred_color || '',
          completed_at: item.completed_at || null
        });
      });
      
      // Convert the map to an array of appointments
      const groupedAppointments: Appointment[] = Array.from(appointmentMap.values())
        .map((appointment) => {
          const services = appointment.services || [];
          const serviceNames = services.map(s => s.service_name || 'Unknown Service');
          const totalPrice = services.reduce((sum, s) => sum + parseFloat(s.price || '0'), 0);
          const totalDuration = services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          
          // Get the first transaction ID for backward compatibility
          const firstTransaction = services[0];
          
          return {
            id: appointment.id,
            customer_id: appointment.customer_id,
            customer_name: appointment.customer_name,
            customer_phone: appointment.customer_phone,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: appointment.status, // Use the appointment's status
            services: services,
            service_names: serviceNames,
            total_price: totalPrice,
            total_duration: totalDuration,
            // For backward compatibility
            service_name: serviceNames.join(' + ') || 'No Service',
            duration_minutes: totalDuration,
            price: totalPrice.toString(),
            notes: services.map(s => s.notes).filter(Boolean).join(', ') || '',
            transaction_id: firstTransaction?.transaction_id
          };
        })
        // Filter out appointments that are NOT confirmed or completed based on appointment status
        .filter(app => app.status === 'confirmed' || app.status === 'completed');
      
      console.log("Grouped staff appointments (confirmed only):", groupedAppointments);
      setStaffAppointments(groupedAppointments);
      return groupedAppointments;
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
          user: item.user,
          hair_length: item.hair_length || '',
          hair_thickness: item.hair_thickness || '',
          preferred_color: item.preferred_color || ''
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

  // Fetch payment proof for remaining balance
  const fetchPaymentProof = async (appointmentId: number) => {
    try {
      console.log(`Fetching payment proof for appointment ID: ${appointmentId}`);
      
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);
      console.log('Payment data response:', response.data);
      
      if (response.data) {
        let paymentData = null;
        
        if (Array.isArray(response.data)) {
          const remainingPayment = response.data.find((item: any) => 
            item.billing?.payment_type === 'remaining' && 
            item.billing?.appointment_id === appointmentId
          );
          
          if (remainingPayment) {
            paymentData = remainingPayment;
          } else {
            const anyPayment = response.data.find((item: any) => 
              item.billing?.appointment_id === appointmentId
            );
            paymentData = anyPayment;
          }
        } else if (response.data.billing) {
          if (response.data.billing?.appointment_id === appointmentId) {
            paymentData = response.data;
          }
        } else if (response.data.appointment_id === appointmentId) {
          paymentData = response.data;
        }
        
        if (paymentData) {
          const actualAppointmentId = paymentData.billing?.appointment_id || paymentData.appointment_id;
          console.log(`Found payment for appointment ${actualAppointmentId}`);
          
          if (actualAppointmentId !== appointmentId) {
            console.warn(`Warning: Expected appointment ${appointmentId}, got ${actualAppointmentId}`);
          }
          
          setSelectedPaymentData(paymentData);
          setShowPaymentProofModal(true);
        } else {
          Alert.alert('No Payment Found', 'No remaining balance payment found for this appointment.');
        }
      } else {
        Alert.alert('No Payment Found', 'No payment record found for this appointment.');
      }
    } catch (error: any) {
      console.error('Error fetching payment proof:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch payment data');
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

  // Fetch product usages for ALL services and keep them all
  const fetchAllProductUsagesForAppointment = async (services: ServiceTransaction[]) => {
    try {
      console.log("Fetching product usages for services:", services);
      
      let allUsages: ProductUsage[] = [];
      
      // Fetch product usages for each service
      for (const service of services) {
        if (!service.service_id) continue;
        
        console.log(`Fetching product usages for service: ${service.service_name} (ID: ${service.service_id})`);
        
        const response = await api.get(`/service/${service.service_id}/product-usages`);
        console.log(`Product usages response for service ${service.service_name}:`, response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          const usages = response.data.map((usage: any) => ({
            id: usage.id,
            product_id: usage.product_id,
            product_name: usage.product_name || 'Unknown Product',
            estimated_usage: usage.estimated_usage || 0,
            inventory_id: usage.inventory_id,
            current_quantity: usage.current_quantity || 0,
            current_usages: usage.current_usages || 0,
            quantity_change: 0,
            service_id: service.service_id,
            service_name: service.service_name
          }));
          allUsages = [...allUsages, ...usages];
          console.log(`Added ${usages.length} products from service ${service.service_name}`);
        } else {
          console.log(`No product usages found for service: ${service.service_name}`);
        }
      }
      
      console.log("Total product usages fetched:", allUsages.length);
      console.log("All product usages:", allUsages);
      
      return allUsages;
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
      setWalkInUpdateData({
        customer_name: item.customer_name,
        amount_paid: item.walk_in_data.amount_paid || 0,
        is_finished: item.walk_in_data.is_finished
      });
      
      if (item.walk_in_data.service_id) {
        const usages = await fetchAllProductUsagesForAppointment([
          {
            id: item.walk_in_data.id,
            service_id: item.walk_in_data.service_id,
            service_name: item.walk_in_data.services?.service_name || 'Unknown Service',
            duration_minutes: item.walk_in_data.services?.duration_minutes || 0,
            price: item.walk_in_data.services?.price?.toString() || '0',
            service_status: 'pending',
            notes: 'Walk-in customer',
            transaction_id: item.walk_in_data.id
          }
        ]);
        setWalkInProductUsages(usages);
      } else {
        setWalkInProductUsages([]);
      }
      
      setShowWalkInUpdateModal(true);
      return;
    }
    
    // Regular appointment
    console.log("Full appointment data:", item);
    
    const appointment = staffAppointments.find(a => a.id === item.id);
    if (!appointment) {
      Alert.alert("Error", "Appointment not found");
      return;
    }
    
    setSelectedAppointment(appointment);
    setUpdateFormData({
      status: appointment.status,
      notes: appointment.notes || ''
    });
    
    // Fetch product usages for ALL services in the appointment
    if (appointment.services && appointment.services.length > 0) {
      console.log("Fetching product usages for all services:", appointment.services);
      const usages = await fetchAllProductUsagesForAppointment(appointment.services);
      console.log("Product usages to display:", usages);
      setProductUsages(usages);
    } else {
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
    
    // Validate product usages for all services
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
        notes: updateFormData.notes,
        product_usages: productUsages
          .filter(p => p.quantity_change > 0 && p.inventory_id)
          .map(p => ({
            inventory_id: p.inventory_id,
            quantity_change: p.quantity_change
          }))
      };
      
      console.log("Updating appointment with data:", updateData);
      
      // Update the entire appointment at once using the new endpoint
      await updateAppointmentServices(selectedAppointment.id, updateData);
      
      Alert.alert("Success", "Appointment updated successfully!");
      setShowUpdateModal(false);
      setSelectedAppointment(null);
      await fetchStaffAppointments();
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update appointment");
    } finally {
      setIsUpdating(false);
    }
  };

  // Walk-in Update functions
  const handleWalkInUpdate = async () => {
    if (!selectedWalkIn) return;
    
    if (!walkInUpdateData.customer_name.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
      return;
    }
    
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
      const updateData = {
        customer_name: walkInUpdateData.customer_name.trim(),
        service_id: selectedWalkIn.service_id,
        stylist_id: selectedWalkIn.stylist_id,
        amount_paid: walkInUpdateData.amount_paid,
        is_finished: walkInUpdateData.is_finished
      };
      
      console.log("Updating walk-in:", selectedWalkIn.id, updateData);
      await updateWalkIn(selectedWalkIn.id, updateData);
      
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
    console.log("Staff appointments (confirmed only):", staffAppointments.length);
    console.log("Walk-ins:", walkIns.length);
    
    const appointmentItems: DisplayItem[] = staffAppointments.map(app => {
      const services = app.services || [];
      
      return {
        id: app.id,
        customer_name: app.customer_name,
        customer_phone: app.customer_phone,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: app.status,
        services: services,
        service_names: app.service_names || ['No Service'],
        total_price: app.total_price || 0,
        total_duration: app.total_duration || 0,
        notes: app.notes,
        transaction_id: app.transaction_id,
        is_walk_in: false,
        walk_in_data: undefined,
        created_at: app.appointment_date,
        service_name: app.service_name,
        duration_minutes: app.duration_minutes,
        price: app.price
      };
    });
    
    const filteredWalkIns = walkIns.filter((walkIn: WalkIn) => {
      const matches = walkIn.stylist_id === currentStaffId;
      console.log(`Walk-in ${walkIn.id} - stylist_id: ${walkIn.stylist_id}, matches: ${matches}`);
      return matches;
    });
    
    const walkInItems: DisplayItem[] = filteredWalkIns.map((walkIn: WalkIn) => {
      const isFinished = walkIn.is_finished === 1;
      const serviceStatus = isFinished ? 'completed' : 'pending';
      
      const stylistName = walkIn.user 
        ? `${walkIn.user.first_name || ''} ${walkIn.user.last_name || ''}`.trim() 
        : 'Unknown Stylist';
      
      const service = {
        id: walkIn.service_id || 0,
        service_id: walkIn.service_id || 0,
        service_name: walkIn.services?.service_name || 'Unknown Service',
        duration_minutes: walkIn.services?.duration_minutes || 0,
        price: walkIn.services?.price?.toString() || '0',
        service_status: serviceStatus,
        notes: 'Walk-in customer',
        transaction_id: walkIn.id,
        hair_length: walkIn.hair_length || '',
        hair_thickness: walkIn.hair_thickness || '',
        preferred_color: walkIn.preferred_color || ''
      };
      
      return {
        id: walkIn.id,
        customer_name: walkIn.customer_name || 'Walk-in Customer',
        customer_phone: undefined,
        appointment_date: walkIn.created_at ? walkIn.created_at.split('T')[0] : undefined,
        appointment_time: walkIn.created_at ? walkIn.created_at.split('T')[1]?.slice(0, 5) : undefined,
        status: isFinished ? 'completed' : 'pending',
        services: [service],
        service_names: [service.service_name],
        total_price: parseFloat(service.price),
        total_duration: service.duration_minutes,
        notes: 'Walk-in customer',
        transaction_id: walkIn.id,
        is_walk_in: true,
        walk_in_data: walkIn,
        stylist_name: stylistName,
        created_at: walkIn.created_at,
        service_name: service.service_name,
        duration_minutes: service.duration_minutes,
        price: service.price
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

  // Payment Proof Modal Component
  const PaymentProofModal = () => {
    if (!selectedPaymentData) return null;
    
    const { payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || 'N/A';
    const total_amount = billing?.total_amount || '0.00';
    const payment_type = billing?.payment_type || 'N/A';
    
    const proofUrl = payment_proof ? `http://192.168.100.73:8000${payment_proof}` : null;
    
    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showPaymentProofModal}
        onRequestClose={() => {
          setShowPaymentProofModal(false);
          setSelectedPaymentData(null);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            <View className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Payment Proof</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowPaymentProofModal(false);
                  setSelectedPaymentData(null);
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="p-6">
              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Appointment ID</Text>
                  <Text className="text-gray-800 font-semibold">#{appointment_id}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Payment Type</Text>
                  <Text className="text-gray-800 font-semibold capitalize">{payment_type}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Total Amount</Text>
                  <Text className="text-pink-600 font-bold">₱{parseFloat(total_amount).toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-sm">Payment Method</Text>
                  <Text className="text-gray-800 font-semibold">{payment_method || 'N/A'}</Text>
                </View>
              </View>

              {proofUrl ? (
                <View className="mb-4">
                  <Text className="text-gray-500 text-sm mb-2">Payment Proof Screenshot</Text>
                  <View className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-64">
                    <Image 
                      source={{ uri: proofUrl }}
                      className="w-full h-full"
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : (
                <View className="bg-gray-100 rounded-lg p-8 mb-4 items-center">
                  <Ionicons name="image-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-sm mt-2">No payment proof uploaded</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  setShowPaymentProofModal(false);
                  setSelectedPaymentData(null);
                }}
                className="w-full py-3 bg-pink-500 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Status dropdown component
  const StatusDropdown = ({ 
    value, 
    onValueChange, 
    options, 
    label,
    placeholder 
  }: { 
    value: string; 
    onValueChange: (value: string) => void; 
    options: string[]; 
    label: string;
    placeholder?: string;
  }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    
    const getStatusColor = (status: string) => {
      switch(status) {
        case 'confirmed': return 'bg-green-100 text-green-700';
        case 'pending': return 'bg-yellow-100 text-yellow-700';
        case 'completed': return 'bg-blue-100 text-blue-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };
    
    return (
      <View className="mb-4">
        <Text className="text-gray-700 font-semibold mb-2">{label}</Text>
        <TouchableOpacity
          onPress={() => setShowDropdown(!showDropdown)}
          className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
        >
          <View className="flex-row items-center">
            {value ? (
              <View className={`px-3 py-1 rounded-full ${getStatusColor(value)}`}>
                <Text className="capitalize text-xs font-semibold">{value}</Text>
              </View>
            ) : (
              <Text className="text-gray-400 text-sm">{placeholder || 'Select status...'}</Text>
            )}
          </View>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
        </TouchableOpacity>
        
        {showDropdown && (
          <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  onValueChange(option);
                  setShowDropdown(false);
                }}
                className={`px-4 py-3 flex-row items-center justify-between ${
                  value === option ? 'bg-pink-50' : ''
                } ${option !== options[options.length - 1] ? 'border-b border-gray-100' : ''}`}
              >
                <View className={`px-3 py-1 rounded-full ${getStatusColor(option)}`}>
                  <Text className="capitalize text-xs font-semibold">{option}</Text>
                </View>
                {value === option && (
                  <Ionicons name="checkmark-circle" size={20} color="#ec4899" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Helper function to render hair details
  const renderHairDetails = (services: ServiceTransaction[]) => {
    // Get unique hair details from all services
    const hairDetails = services
      .filter(s => s.hair_length || s.hair_thickness || s.preferred_color)
      .map(s => ({
        hair_length: s.hair_length,
        hair_thickness: s.hair_thickness,
        preferred_color: s.preferred_color
      }));
    
    // If no hair details, return null
    if (hairDetails.length === 0) return null;
    
    // Get the first non-empty hair details
    const details = hairDetails.find(d => d.hair_length || d.hair_thickness || d.preferred_color);
    if (!details) return null;
    
    const parts = [];
    if (details.hair_length) parts.push(`Length: ${details.hair_length.charAt(0).toUpperCase() + details.hair_length.slice(1)}`);
    if (details.hair_thickness) parts.push(`Thickness: ${details.hair_thickness.charAt(0).toUpperCase() + details.hair_thickness.slice(1)}`);
    if (details.preferred_color) parts.push(`Color: ${details.preferred_color}`);
    
    if (parts.length === 0) return null;
    
    return (
      <View className="flex-row items-center mt-1 flex-wrap">
        <Ionicons name="color-palette-outline" size={12} color="#8b5cf6" />
        <Text className="text-purple-600 text-xs ml-1">
          {parts.join(' • ')}
        </Text>
      </View>
    );
  };

  // Helper function to render transaction details in the update modal
  const renderTransactionDetails = (services: ServiceTransaction[]) => {
    if (!services || services.length === 0) return null;
    
    return (
      <View className="mb-4 p-3 bg-gray-50 rounded-xl">
        <Text className="text-gray-600 text-sm font-semibold mb-2">Transaction Details</Text>
        {services.map((service, index) => {
          const hasHairDetails = service.hair_length || service.hair_thickness || service.preferred_color;
          return (
            <View key={index} className={`${index > 0 ? 'border-t border-gray-200 pt-2 mt-2' : ''}`}>
              <Text className="text-gray-800 font-semibold text-sm">{service.service_name}</Text>
              <View className="mt-1 space-y-1">
                {service.hair_length && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Hair Length:</Text>
                    <Text className="text-gray-700 text-xs font-medium capitalize">{service.hair_length}</Text>
                  </View>
                )}
                {service.hair_thickness && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Hair Thickness:</Text>
                    <Text className="text-gray-700 text-xs font-medium capitalize">{service.hair_thickness}</Text>
                  </View>
                )}
                {service.preferred_color && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Preferred Color:</Text>
                    <Text className="text-gray-700 text-xs font-medium">{service.preferred_color}</Text>
                  </View>
                )}
                {!hasHairDetails && (
                  <Text className="text-gray-400 text-xs italic">No hair details recorded</Text>
                )}
                {service.completed_at && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Completed:</Text>
                    <Text className="text-gray-700 text-xs font-medium">{new Date(service.completed_at).toLocaleDateString()}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItemCard = (item: DisplayItem) => {
    const isCompleted = item.status === 'completed';
    const isWalkIn = item.is_walk_in;
    const isMultipleServices = item.services && item.services.length > 1;
    const services = item.services || [];
    
    const stylistName = isWalkIn && item.walk_in_data?.user 
      ? `${item.walk_in_data.user.first_name || ''} ${item.walk_in_data.user.last_name || ''}`.trim()
      : item.stylist_name || '';
    
    // Get hair details from the services
    const hairDetails = renderHairDetails(services);
    
    return (
      <View key={`${item.id}`} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className={`p-2 rounded-full mr-3 ${isWalkIn ? 'bg-green-100' : 'bg-pink-100'}`}>
                <Ionicons name={isWalkIn ? "walk-outline" : "person-outline"} size={20} color={isWalkIn ? "#16a34a" : "#ec4899"} />
              </View>
              <View>
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-gray-800 font-bold text-lg">
                    {item.customer_name}
                  </Text>
                  {isWalkIn && (
                    <View className="ml-2 bg-green-100 px-2 py-0.5 rounded-full">
                      <Text className="text-green-700 text-xs font-semibold">Walk-in</Text>
                    </View>
                  )}
                  {isMultipleServices && (
                    <View className="ml-2 bg-pink-100 px-2 py-0.5 rounded-full">
                      <Text className="text-pink-600 text-xs font-semibold">
                        {services.length} services
                      </Text>
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
              <Text className="text-gray-600 text-sm ml-1">
                {item.service_names ? item.service_names.join(' + ') : 'No Service'}
              </Text>
            </View>
            
            {/* Hair Details */}
            {hairDetails}
            
            {isMultipleServices && services.length > 0 && (
              <View className="mt-1 ml-5">
                {services.map((service, index) => (
                  <View key={index} className="flex-row items-center mt-0.5">
                    <View className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    <Text className="text-gray-500 text-xs">
                      {service.service_name} ({service.duration_minutes} mins) - ₱{parseFloat(service.price).toLocaleString()}
                    </Text>
                    {/* Show individual service hair details if any */}
                    {(service.hair_length || service.hair_thickness || service.preferred_color) && (
                      <Text className="text-purple-500 text-[10px] ml-1">
                        [{service.hair_length || ''} {service.hair_thickness || ''} {service.preferred_color || ''}]
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            <View className="flex-row items-center mt-1">
              <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">
                {isMultipleServices ? `Total: ${item.total_duration} mins` : `${item.duration_minutes} mins`}
              </Text>
            </View>
            
            {item.notes && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="document-text-outline" size={12} color="#9ca3af" />
                <Text className="text-gray-400 text-xs italic" numberOfLines={1}>{item.notes}</Text>
              </View>
            )}
          </View>
          
          <View className={`px-3 py-1.5 rounded-full ${
            item.status === 'completed' ? 'bg-green-100' :
            item.status === 'confirmed' ? 'bg-blue-100' : 'bg-pink-100'
          }`}>
            <Text className={`text-xs font-semibold ${
              item.status === 'confirmed' ? 'text-blue-700' :
              item.status === 'completed' ? 'text-green-700' : 'text-pink-700'
            }`}>
              {item.status === 'confirmed' ? 'CONFIRMED' : 
               item.status === 'completed' ? 'COMPLETED' : 
               item.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>
        
        <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
          <Text className="text-pink-500 font-bold text-lg">
            ₱{isMultipleServices ? item.total_price.toLocaleString() : parseFloat(item.price || '0').toLocaleString()}
          </Text>
          
          <View className="flex-row gap-2">
            {!isWalkIn && (
              <TouchableOpacity 
                className="bg-purple-500 px-3 py-2 rounded-xl"
                onPress={() => fetchPaymentProof(item.id)}
              >
                <Ionicons name="image-outline" size={16} color="white" />
              </TouchableOpacity>
            )}
            
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
              <Text className="text-xl font-bold text-white">Update Appointment</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-6">
              <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-500 text-sm">Customer</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.customer_name}</Text>
                <Text className="text-gray-500 text-sm mt-2">Services</Text>
                <Text className="text-gray-800 font-semibold">
                  {selectedAppointment?.service_names?.join(' + ') || 'No Service'}
                </Text>
                {selectedAppointment?.services && selectedAppointment.services.length > 1 && (
                  <View className="mt-1">
                    {selectedAppointment.services.map((service, index) => (
                      <Text key={index} className="text-gray-600 text-sm ml-2">
                        • {service.service_name}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              
              {/* Transaction Details */}
              {selectedAppointment?.services && selectedAppointment.services.length > 0 && (
                renderTransactionDetails(selectedAppointment.services)
              )}
              
              {/* Appointment Status - Dropdown ONLY */}
              <StatusDropdown
                label="Appointment Status"
                value={updateFormData.status}
                onValueChange={(value) => setUpdateFormData(prev => ({ ...prev, status: value }))}
                options={['pending', 'confirmed', 'completed', 'cancelled']}
                placeholder="Select appointment status..."
              />
              
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
                      No products configured for these services
                    </Text>
                  </View>
                ) : (
                  productUsages.map((product, index) => (
                    <View key={`${product.id}-${product.service_id || index}`} className="bg-gray-50 rounded-xl p-3 mb-3">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-gray-800 font-semibold flex-1">{product.product_name}</Text>
                        {product.service_name && (
                          <View className="bg-pink-100 px-2 py-0.5 rounded-full ml-2">
                            <Text className="text-pink-600 text-[10px] font-medium">
                              {product.service_name}
                            </Text>
                          </View>
                        )}
                      </View>
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
                  {isUpdating ? 'Updating...' : 'Update Appointment'}
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
                {/* Walk-in Hair Details */}
                {(selectedWalkIn?.hair_length || selectedWalkIn?.hair_thickness || selectedWalkIn?.preferred_color) && (
                  <View className="mt-2 pt-2 border-t border-gray-200">
                    <Text className="text-gray-600 text-sm font-semibold">Hair Details</Text>
                    {selectedWalkIn?.hair_length && (
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-gray-500 text-sm">Hair Length:</Text>
                        <Text className="text-gray-700 text-sm capitalize">{selectedWalkIn.hair_length}</Text>
                      </View>
                    )}
                    {selectedWalkIn?.hair_thickness && (
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-gray-500 text-sm">Hair Thickness:</Text>
                        <Text className="text-gray-700 text-sm capitalize">{selectedWalkIn.hair_thickness}</Text>
                      </View>
                    )}
                    {selectedWalkIn?.preferred_color && (
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-gray-500 text-sm">Preferred Color:</Text>
                        <Text className="text-gray-700 text-sm">{selectedWalkIn.preferred_color}</Text>
                      </View>
                    )}
                  </View>
                )}
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

      {/* Payment Proof Modal */}
      <PaymentProofModal />
    </>
  );
}