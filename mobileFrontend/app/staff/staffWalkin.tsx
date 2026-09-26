import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

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
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    profile_image?: string;
    staff_specialties?: Array<{
      id: number;
      staff_id: number;
      specialty_id: number;
      is_active: number;
      specialties?: {
        id: number;
        specialty_name: string;
      };
    }>;
  };
  business_schedules?: BusinessSchedule;
}

interface WalkInAuthorization {
  staff_id: number;
  isAuthorizedForWalkin?: number;
  isAuthorizedForWalkIn?: number;
}

interface Service {
  id: number;
  service_name: string;
  description: string;
  price: number;
  duration_minutes: number;
  service_status?: string;
  is_multitaskable: number;
  service_specialties?: any[];
  created_at?: string;
  updated_at?: string;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  profile_image?: string;
  staff_specialties: Array<{
    id: number;
    staff_id: number;
    specialty_id: number;
    is_active: number;
    specialties?: {
      id: number;
      specialty_name: string;
    };
  }>;
}

interface StaffFeedback {
  id: number;
  staff_id: number;
  rating: number;
}

interface WalkIn {
  id: number;
  customer_name: string;
  service_id: number;
  stylist_id: number;
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

interface StaffAppointment {
  id: number;
  appointment_id: number;
  service_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_status: string;
  assigned_employee_id?: number | null;
  service_name: string;
  duration_minutes: number;
  price: string;
  created_at: string;
  updated_at: string;
  staff_name?: string;
  notes?: string;
  billing_total_amount?: number | null;
  billing_paid_amount?: number | null;
  billing_balance?: number | null;
  billing_payment_type?: string | null;
}

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

interface StaffWalkInProps {
  onSuccess?: () => void;
}

export default function StaffWalkIn({ onSuccess }: StaffWalkInProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [bookingStep, setBookingStep] = useState<'stylist' | 'services' | 'confirm' | 'manage'>('stylist');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [staffAppointments, setStaffAppointments] = useState<StaffAppointment[]>([]);
  const [isLoadingWalkIns, setIsLoadingWalkIns] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<StaffAppointment | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState<PaymentData | null>(null);
  const [isUpdatingWalkIn, setIsUpdatingWalkIn] = useState(false);
  const [isUpdatingAppointment, setIsUpdatingAppointment] = useState(false);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSpecialties, setServiceSpecialties] = useState<any[]>([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState<StaffFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  const [localBusinessSchedules, setLocalBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [localStaffAssignments, setLocalStaffAssignments] = useState<StaffAssignment[]>([]);

  // ─────────────────────────────────────────────────────────────
  // Data fetchers
  // ─────────────────────────────────────────────────────────────
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) staffData = response.data;
      setStaff(staffData);
      return staffData;
    } catch { return []; }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      let servicesData: Service[] = [];
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
    } catch { return []; }
  };

  const fetchServiceSpecialties = async () => {
    try {
      const response = await api.get("/services/specialties");
      let specialtiesData: any[] = [];
      if (Array.isArray(response.data)) specialtiesData = response.data;
      setServiceSpecialties(specialtiesData);
      return specialtiesData;
    } catch { return []; }
  };

  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get("/feedbacks/staff");
      let staffFeedbacksData: StaffFeedback[] = [];
      if (Array.isArray(response.data)) {
        staffFeedbacksData = response.data.map((item: any) => ({
          id: item.id || 0,
          staff_id: item.staff_id || 0,
          rating: parseFloat(item.rating) || 0
        }));
      }
      setStaffFeedbacks(staffFeedbacksData);
      return staffFeedbacksData;
    } catch { return []; }
  };

  const fetchWalkIns = async () => {
    setIsLoadingWalkIns(true);
    try {
      const response = await api.get('/walk-in');
      let walkInsData: WalkIn[] = [];
      if (Array.isArray(response.data)) {
        walkInsData = response.data.map((item: any) => ({
          id: item.id,
          customer_name: item.customer_name,
          service_id: item.service_id,
          stylist_id: item.stylist_id,
          is_finished: item.is_finished,
          created_at: item.created_at,
          updated_at: item.updated_at,
          services: item.services,
          user: item.user
        }));
      }
      const currentStaffId = user?.id;
      const filtered = walkInsData.filter(w => w.stylist_id === currentStaffId);
      setWalkIns(filtered);
      return filtered;
    } catch { return []; }
    finally { setIsLoadingWalkIns(false); }
  };

  const fetchAllAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const response = await api.get('/all-appointments');

      let rawData: any[] = [];
      if (Array.isArray(response.data)) {
        rawData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        rawData = response.data.data;
      }

      const appointmentMap = new Map<number, StaffAppointment>();

      rawData.forEach((item: any) => {
        const appointmentId = item.appointment_id ?? item.id;

        if (!appointmentMap.has(appointmentId)) {
          appointmentMap.set(appointmentId, {
            id: item.id,
            appointment_id: appointmentId,
            service_id: item.service_id,
            customer_name: item.customer_name || 'Walk-in Customer',
            customer_phone: item.customer_phone || 'N/A',
            customer_email: item.customer_email || 'N/A',
            appointment_date: item.appointment_date,
            appointment_time: item.appointment_time || '--:--',
            status: item.status || 'pending',
            service_status: item.service_status || 'pending',
            assigned_employee_id: item.assigned_employee_id ?? null,
            service_name: item.service_name || 'Unknown Service',
            duration_minutes: item.duration_minutes || 0,
            price: item.price?.toString() || '0',
            created_at: item.created_at,
            updated_at: item.updated_at,
            notes: item.notes,
            billing_total_amount: item.billing_total_amount ?? null,
            billing_paid_amount: item.billing_paid_amount ?? null,
            billing_balance: item.billing_balance ?? null,
            billing_payment_type: item.billing_payment_type ?? null,
          });
        } else {
          const existing = appointmentMap.get(appointmentId)!;
          existing.service_name = `${existing.service_name} + ${item.service_name || 'Unknown Service'}`;
          existing.duration_minutes += item.duration_minutes || 0;
          existing.price = (
            parseFloat(existing.price) + parseFloat(item.price?.toString() || '0')
          ).toString();
        }
      });

      const appointmentsData = Array.from(appointmentMap.values());

      appointmentsData.sort((a, b) => {
        const da = new Date(`${a.appointment_date} ${a.appointment_time}`).getTime();
        const db = new Date(`${b.appointment_date} ${b.appointment_time}`).getTime();
        return db - da;
      });

      setStaffAppointments(appointmentsData);
      return appointmentsData;
    } catch (error) {
      console.log('[fetchAllAppointments] error:', error);
      return [];
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const fetchPaymentProof = async (appointmentId: number) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);

      if (!response.data) {
        Alert.alert('No Payment Found', 'No payment record found for this appointment.');
        return;
      }

      let paymentData = null;

      if (Array.isArray(response.data)) {
        const match = response.data.find((item: any) => {
          const itemAppointmentId = item.billing?.appointment_id || item.appointment_id;
          return itemAppointmentId === appointmentId;
        });
        if (match) paymentData = match;
      } else if (response.data.billing || response.data.appointment_id) {
        const itemAppointmentId = response.data.billing?.appointment_id || response.data.appointment_id;
        if (itemAppointmentId === appointmentId) paymentData = response.data;
      }

      if (paymentData) {
        const actualAppointmentId = paymentData.billing?.appointment_id || paymentData.appointment_id;
        if (actualAppointmentId && actualAppointmentId !== appointmentId) {
          Alert.alert('Data Mismatch', 'Payment data does not match this appointment.');
          return;
        }
        if (paymentData.payment_proof) {
          setSelectedPaymentData(paymentData);
          setShowPaymentProofModal(true);
        } else {
          Alert.alert('No Payment Proof', 'No payment proof uploaded yet.');
        }
      } else {
        Alert.alert('No Payment Found', `No payment record found for appointment #${appointmentId}.`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch payment data');
    }
  };

  const updateWalkInStatus = async (walkInId: number, isFinished: number) => {
    setIsUpdatingWalkIn(true);
    try {
      const walkIn = walkIns.find(w => w.id === walkInId);
      if (!walkIn) {
        Alert.alert('Error', 'Walk-in not found');
        return;
      }

      await api.post(`/walk-in/update/${walkInId}`, {
        customer_name: walkIn.customer_name,
        service_id: walkIn.service_id,
        stylist_id: walkIn.stylist_id,
        amount_paid: 0,
        is_finished: isFinished
      });

      Alert.alert('Success', isFinished === 1 ? 'Walk-in marked as completed!' : 'Walk-in marked as pending!');
      setShowWalkInModal(false);
      setSelectedWalkIn(null);
      await fetchWalkIns();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update walk-in');
    } finally {
      setIsUpdatingWalkIn(false);
    }
  };

  const updateAppointmentStatus = async (appointment: StaffAppointment, newStatus: string) => {
    setIsUpdatingAppointment(true);
    try {
      const appointmentId = appointment.appointment_id || appointment.id;
      await api.put(`/appointments/update/${appointmentId}`, { status: newStatus });
      Alert.alert('Success', newStatus === 'confirmed' ? 'Appointment confirmed!' : 'Appointment cancelled.');
      setShowAppointmentModal(false);
      setSelectedAppointment(null);
      await fetchAllAppointments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update appointment');
    } finally {
      setIsUpdatingAppointment(false);
    }
  };

  const submitWalkIn = async (data: { customer_name: string; service_id: number; stylist_id: number; is_finished: number }) => {
    const response = await api.post('/walk-in/add', {
      customer_name: data.customer_name,
      service_id: data.service_id,
      stylist_id: data.stylist_id,
      is_finished: data.is_finished !== undefined ? data.is_finished : 0
    });
    return response.data;
  };

  const checkWalkInAuthorization = async () => {
    setIsCheckingAuth(true);
    try {
      const response = await api.get('/walk-in/staff');
      if (Array.isArray(response.data)) {
        const currentStaffId = user?.id;
        const authData = response.data.find((auth: WalkInAuthorization) => auth.staff_id === currentStaffId);
        const isAuthorizedWalkIn = authData?.isAuthorizedForWalkin === 1 || authData?.isAuthorizedForWalkIn === 1;
        setIsAuthorized(isAuthorizedWalkIn);
        if (!isAuthorizedWalkIn) setShowUnauthorizedModal(true);
      } else {
        setIsAuthorized(false);
        setShowUnauthorizedModal(true);
      }
    } catch {
      setIsAuthorized(false);
      setShowUnauthorizedModal(true);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data)) setLocalBusinessSchedules(response.data);
    } catch {}
  };

  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      if (Array.isArray(response.data)) setLocalStaffAssignments(response.data);
    } catch {}
  };

  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const getTodayStaff = useCallback(() => {
    const todayStr = getUTCDateString(new Date());
    const schedule = localBusinessSchedules.find(s => s.business_date === todayStr);
    if (!schedule) return [];
    const assignments = localStaffAssignments.filter(a => a.business_date_id === schedule.id);
    const staffIds = assignments.map(a => a.staff_id);
    return staff.filter(s => staffIds.includes(s.id));
  }, [localBusinessSchedules, localStaffAssignments, staff]);

  const getServiceSpecialties = (serviceId: number) => {
    return serviceSpecialties.filter(item => item.service_id === serviceId);
  };

  const getServicesForStaff = () => {
    if (!selectedStaffId) return [];
    const selectedStaff = staff.find(s => s.id === selectedStaffId);
    if (!selectedStaff) return [];
    const staffSpecialties = selectedStaff.staff_specialties
      ?.filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name?.toLowerCase()) || [];
    const activeServices = services.filter(s => s.service_status === 'active');
    return activeServices.filter(service => {
      const specialties = getServiceSpecialties(service.id);
      return specialties.some(ss => {
        const name = ss.specialties?.specialty_name?.toLowerCase();
        return staffSpecialties.includes(name);
      });
    });
  };

  const handleStaffSelect = (staffId: number) => {
    setSelectedStaffId(staffId);
    setSelectedServiceId(null);
    setBookingStep('services');
  };

  const handleServiceSelect = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    setBookingStep('confirm');
  };

  const handleBackToStylist = () => {
    setBookingStep('stylist');
    setSelectedServiceId(null);
  };

  const handleBackToServices = () => {
    setBookingStep('services');
  };

  const handleBackToManage = () => {
    setBookingStep('manage');
    fetchWalkIns();
    fetchAllAppointments();
  };

  const handleConfirmWalkIn = async () => {
    if (!customerName.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
      return;
    }
    if (!selectedStaffId) {
      Alert.alert("Validation Error", "Please select a stylist");
      return;
    }
    if (!selectedServiceId) {
      Alert.alert("Validation Error", "Please select a service");
      return;
    }

    setIsProcessing(true);
    try {
      await submitWalkIn({
        customer_name: customerName.trim(),
        service_id: selectedServiceId,
        stylist_id: selectedStaffId,
        is_finished: 0
      });

      Alert.alert("Success", "Walk-in customer added successfully!");
      setCustomerName('');
      setSelectedStaffId(null);
      setSelectedServiceId(null);
      setBookingStep('manage');
      await fetchWalkIns();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to add walk-in customer");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  const getStaffName = (staffId: number | null) => {
    if (!staffId) return '';
    const member = staff.find(s => s.id === staffId);
    return member ? `${member.first_name} ${member.last_name}` : '';
  };

  const getStaffSpecialties = (staffId: number | null) => {
    if (!staffId) return 'No specialties assigned';
    const member = staff.find(s => s.id === staffId);
    if (!member?.staff_specialties) return 'No specialties assigned';
    return member.staff_specialties
      .filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name || '')
      .filter(Boolean)
      .join(', ');
  };

  const getServiceName = () => {
    if (!selectedServiceId) return '';
    return services.find(s => s.id === selectedServiceId)?.service_name || '';
  };

  const getServicePrice = () => {
    if (!selectedServiceId) return 0;
    return services.find(s => s.id === selectedServiceId)?.price || 0;
  };

  const getStaffRating = (staffId: number) => {
    try {
      const reviews = staffFeedbacks.filter(f => f.staff_id === staffId);
      if (reviews.length === 0) return { average: 0, count: 0 };
      const total = reviews.reduce((sum, fb) => {
        const rating = typeof fb.rating === 'number' ? fb.rating : parseFloat(fb.rating as any) || 0;
        return sum + rating;
      }, 0);
      return { average: parseFloat((total / reviews.length).toFixed(1)), count: reviews.length };
    } catch { return { average: 0, count: 0 }; }
  };

  const renderStars = (rating: number) => {
    const valid = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
    const full = Math.floor(valid);
    const half = valid % 1 >= 0.5;
    const stars = [];
    for (let i = 0; i < full; i++) stars.push(<Ionicons key={`s-${i}`} name="star" size={14} color="#fbbf24" />);
    if (half) stars.push(<Ionicons key="half" name="star-half" size={14} color="#fbbf24" />);
    const empty = 5 - stars.length;
    for (let i = 0; i < empty; i++) stars.push(<Ionicons key={`e-${i}`} name="star-outline" size={14} color="#d1d5db" />);
    return stars;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Modals
  // ─────────────────────────────────────────────────────────────

  // ✅ Payment Proof Modal — header is PINK
  const PaymentProofModal = () => {
    if (!selectedPaymentData) return null;
    const { payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || 'N/A';
    const total_amount = billing?.total_amount || '0.00';
    const payment_type = billing?.payment_type || 'N/A';
    const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");
    const proofUrl = payment_proof ? `${BASE_URL}${payment_proof}` : null;

    return (
      <Modal transparent animationType="slide" visible={showPaymentProofModal}
        onRequestClose={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            {/* ✅ PINK HEADER */}
            <View
              className="px-6 py-4 flex-row justify-between items-center"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white text-xl font-bold">Payment Proof</Text>
              <TouchableOpacity onPress={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}>
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
                    <Image source={{ uri: proofUrl }} className="w-full h-full" resizeMode="contain" />
                  </View>
                </View>
              ) : (
                <View className="bg-gray-100 rounded-lg p-8 mb-4 items-center">
                  <Ionicons name="image-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-sm mt-2">No payment proof uploaded</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}
                className="w-full py-3 rounded-xl"
                style={{ backgroundColor: '#ec4899' }}
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const WalkInDetailsModal = () => {
    if (!selectedWalkIn) return null;
    const isFinished = selectedWalkIn.is_finished === 1;
    const stylistName = selectedWalkIn.user
      ? `${selectedWalkIn.user.first_name || ''} ${selectedWalkIn.user.last_name || ''}`.trim()
      : 'Unknown Stylist';

    return (
      <Modal transparent animationType="slide" visible={showWalkInModal}
        onRequestClose={() => { setShowWalkInModal(false); setSelectedWalkIn(null); }}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            {/* ✅ PINK HEADER */}
            <View
              className="px-6 py-4 flex-row justify-between items-center"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white text-xl font-bold">Walk-in Details</Text>
              <TouchableOpacity onPress={() => { setShowWalkInModal(false); setSelectedWalkIn(null); }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View className="p-6">
              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Customer</Text>
                  <Text className="text-gray-800 font-semibold">{selectedWalkIn.customer_name}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Service</Text>
                  <Text className="text-gray-800 font-semibold">{selectedWalkIn.services?.service_name || 'Unknown'}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Stylist</Text>
                  <Text className="text-gray-800 font-semibold">{stylistName}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Date</Text>
                  <Text className="text-gray-800 font-semibold">{formatDate(selectedWalkIn.created_at)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-sm">Time</Text>
                  <Text className="text-gray-800 font-semibold">{formatTime(selectedWalkIn.created_at?.split('T')[1] || '')}</Text>
                </View>
              </View>
              <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-gray-500 text-sm">Current Status</Text>
                <View className={`mt-1 px-3 py-1 rounded-full self-start ${isFinished ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <Text className={`text-xs font-semibold ${isFinished ? 'text-green-700' : 'text-yellow-700'}`}>
                    {isFinished ? '✅ Completed' : '⏳ Pending'}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => { setShowWalkInModal(false); setSelectedWalkIn(null); }}
                  className="flex-1 py-3 rounded-xl border border-gray-300">
                  <Text className="text-gray-600 text-center font-semibold">Close</Text>
                </TouchableOpacity>
                {!isFinished ? (
                  <TouchableOpacity onPress={() => updateWalkInStatus(selectedWalkIn.id, 1)}
                    disabled={isUpdatingWalkIn} className="flex-1 py-3 rounded-xl bg-green-600">
                    <Text className="text-white text-center font-semibold">
                      {isUpdatingWalkIn ? 'Updating...' : 'Mark Complete'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => updateWalkInStatus(selectedWalkIn.id, 0)}
                    disabled={isUpdatingWalkIn} className="flex-1 py-3 rounded-xl bg-yellow-600">
                    <Text className="text-white text-center font-semibold">
                      {isUpdatingWalkIn ? 'Updating...' : 'Mark Pending'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ✅ Appointment Details Modal — header is PINK
  const AppointmentDetailsModal = () => {
    if (!selectedAppointment) return null;
    const isPending = selectedAppointment.status === 'pending';
    const appointmentId = selectedAppointment.appointment_id || selectedAppointment.id;

    const basePrice = parseFloat(selectedAppointment.price || '0');
    const grandTotal = selectedAppointment.billing_total_amount ?? basePrice;
    const paidAmount = selectedAppointment.billing_paid_amount ?? 0;
    const balance = selectedAppointment.billing_balance ?? (grandTotal - paidAmount);

    return (
      <Modal transparent animationType="slide" visible={showAppointmentModal}
        onRequestClose={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            {/* ✅ PINK HEADER */}
            <View
              className="px-6 py-4 flex-row justify-between items-center"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white text-xl font-bold">Appointment Details</Text>
              <TouchableOpacity onPress={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-[500px]">
              <View className="p-6">
                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Customer</Text>
                    <Text className="text-gray-800 font-semibold">{selectedAppointment.customer_name}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Service</Text>
                    <Text className="text-gray-800 font-semibold flex-1 text-right ml-2">{selectedAppointment.service_name}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Date</Text>
                    <Text className="text-gray-800 font-semibold">{formatDate(selectedAppointment.appointment_date)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Time</Text>
                    <Text className="text-gray-800 font-semibold">{formatTime(selectedAppointment.appointment_time)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">Duration</Text>
                    <Text className="text-gray-800 font-semibold">{selectedAppointment.duration_minutes} mins</Text>
                  </View>
                </View>

                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <Text className="text-gray-700 text-sm font-bold mb-2">Payment Summary</Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-sm">Total Amount</Text>
                    <Text className="text-gray-800 font-semibold">₱{grandTotal.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-sm">Amount Paid</Text>
                    <Text className="text-green-600 font-semibold">₱{paidAmount.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">Balance</Text>
                    <Text className={`font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {balance > 0 ? `₱${balance.toLocaleString()}` : 'Paid in Full'}
                    </Text>
                  </View>
                </View>

                <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <Text className="text-gray-500 text-sm">Status</Text>
                  <View className={`mt-1 px-3 py-1 rounded-full self-start ${getStatusColor(selectedAppointment.status)}`}>
                    <Text className="text-xs font-semibold capitalize">{selectedAppointment.status}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => fetchPaymentProof(appointmentId)}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-purple-100 mb-4">
                  <Ionicons name="image-outline" size={20} color="#7c3aed" />
                  <Text className="text-purple-700 font-semibold">View Payment Proof</Text>
                </TouchableOpacity>

                {isPending ? (
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}
                      className="flex-1 py-3 rounded-xl border border-gray-300">
                      <Text className="text-gray-600 text-center font-semibold">Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateAppointmentStatus(selectedAppointment, 'confirmed')}
                      disabled={isUpdatingAppointment} className="flex-1 py-3 rounded-xl bg-green-600">
                      <Text className="text-white text-center font-semibold">
                        {isUpdatingAppointment ? '...' : 'Confirm'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateAppointmentStatus(selectedAppointment, 'cancelled')}
                      disabled={isUpdatingAppointment} className="flex-1 py-3 rounded-xl bg-red-600">
                      <Text className="text-white text-center font-semibold">
                        {isUpdatingAppointment ? '...' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}
                      className="flex-1 py-3 rounded-xl border border-gray-300">
                      <Text className="text-gray-600 text-center font-semibold">Close</Text>
                    </TouchableOpacity>
                    <View className="flex-1 py-3 rounded-xl bg-gray-200 items-center justify-center">
                      <Text className="text-gray-600 text-center font-semibold">
                        {selectedAppointment.status === 'confirmed' ? '✅ Confirmed' :
                         selectedAppointment.status === 'completed' ? '✅ Completed' :
                         selectedAppointment.status === 'cancelled' ? '❌ Cancelled' : ''}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);
    Promise.all([
      fetchBusinessSchedules(),
      fetchStaffAssignments(),
      fetchStaff(),
      fetchServices(),
      fetchServiceSpecialties(),
      fetchStaffFeedbacks(),
      checkWalkInAuthorization(),
      fetchWalkIns(),
      fetchAllAppointments(),
    ]).finally(() => setIsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (bookingStep === 'manage' && user?.id) {
      fetchWalkIns();
      fetchAllAppointments();
    }
  }, [bookingStep, user?.id]);

  const todayStaff = getTodayStaff();

  const UnauthorizedModal = () => (
    <Modal transparent animationType="fade" visible={showUnauthorizedModal} onRequestClose={() => {}}>
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-white rounded-2xl w-[85%] max-w-sm p-6">
          <View className="items-center mb-4">
            <View className="w-20 h-20 bg-pink-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="alert-circle" size={50} color="#ec4899" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 text-center">Not Authorized</Text>
          </View>
          <Text className="text-gray-600 text-center mb-6">
            You are not authorized to add walk-in customers. Please contact the salon owner to request access.
          </Text>
          <TouchableOpacity className="bg-pink-500 py-3 rounded-xl"
            onPress={() => { setShowUnauthorizedModal(false); if (onSuccess) onSuccess(); }}>
            <Text className="text-white text-center font-semibold text-lg">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isCheckingAuth) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#ec4899" />
        <Text className="text-gray-500 mt-4">Checking authorization...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <>
        <View className="flex-1 bg-gray-50 opacity-50">
          <View className="flex-1 justify-center items-center">
            <Ionicons name="lock-closed" size={60} color="#9ca3af" />
            <Text className="text-gray-400 text-lg mt-4">Walk-in feature is locked</Text>
            <Text className="text-gray-400 text-sm">You are not authorized to use this feature</Text>
          </View>
        </View>
        <UnauthorizedModal />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  const renderContent = () => {
    const selectedStaff = selectedStaffId ? staff.find(s => s.id === selectedStaffId) : null;
    const servicesForStaff = getServicesForStaff();
    const totalPrice = getServicePrice();

    // ── Manage view ──
    if (bookingStep === 'manage') {
      const staffAppointmentList = staffAppointments;

      return (
        <View className="flex-1 bg-gray-50">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6 pb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-3xl font-bold text-gray-800">My Walk-ins</Text>
                <TouchableOpacity
                  className="bg-pink-500 px-4 py-2 rounded-xl flex-row items-center"
                  onPress={() => {
                    setCustomerName('');
                    setSelectedStaffId(null);
                    setSelectedServiceId(null);
                    setBookingStep('stylist');
                  }}>
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white font-semibold ml-1">New</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-gray-500 mb-4">
                Manage your walk-in customers and view all appointments
              </Text>

              {/* Walk-ins */}
              <View className="flex-row items-center mb-3">
                <View className="w-1 h-6 bg-pink-500 rounded-full mr-2" />
                <Text className="text-xl font-bold text-gray-800">Walk-ins</Text>
                <View className="ml-2 bg-pink-100 px-2 py-0.5 rounded-full">
                  <Text className="text-pink-600 text-xs font-semibold">{walkIns.length}</Text>
                </View>
              </View>

              {isLoadingWalkIns ? (
                <View className="py-6 items-center mb-4">
                  <ActivityIndicator size="small" color="#ec4899" />
                  <Text className="text-center text-gray-500 mt-2">Loading walk-ins...</Text>
                </View>
              ) : walkIns.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center mb-6" style={{ elevation: 2 }}>
                  <Ionicons name="walk-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">No walk-in customers yet</Text>
                  <TouchableOpacity
                    className="mt-4 bg-pink-500 px-6 py-2 rounded-full"
                    onPress={() => {
                      setCustomerName('');
                      setSelectedStaffId(null);
                      setSelectedServiceId(null);
                      setBookingStep('stylist');
                    }}>
                    <Text className="text-white font-semibold">Add Walk-in</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="mb-6">
                  {walkIns.map((walkIn) => {
                    const isFinished = walkIn.is_finished === 1;
                    const stylistName = walkIn.user
                      ? `${walkIn.user.first_name || ''} ${walkIn.user.last_name || ''}`.trim()
                      : 'Unknown Stylist';
                    return (
                      <TouchableOpacity
                        key={walkIn.id}
                        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
                        onPress={() => { setSelectedWalkIn(walkIn); setShowWalkInModal(true); }}>
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-800">{walkIn.customer_name}</Text>
                            <Text className="text-gray-500 text-sm">{walkIn.services?.service_name || 'Unknown Service'}</Text>
                            <Text className="text-gray-400 text-xs">Stylist: {stylistName}</Text>
                            <Text className="text-gray-400 text-xs">Created: {formatDate(walkIn.created_at)}</Text>
                          </View>
                          <View className={`px-3 py-1 rounded-full ${isFinished ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <Text className={`text-xs font-semibold ${isFinished ? 'text-green-700' : 'text-yellow-700'}`}>
                              {isFinished ? 'COMPLETED' : 'PENDING'}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                          <Text className="text-pink-500 font-bold text-sm">
                            ₱{parseFloat(walkIn.services?.price || '0').toLocaleString()}
                          </Text>
                          <TouchableOpacity
                            className="bg-blue-100 px-3 py-1.5 rounded-lg"
                            onPress={() => { setSelectedWalkIn(walkIn); setShowWalkInModal(true); }}>
                            <Text className="text-blue-700 text-xs font-semibold">View</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Separator */}
              <View className="flex-row items-center my-2 mb-4">
                <View className="flex-1 h-px bg-gray-200" />
                <View className="px-3">
                  <Ionicons name="ellipsis-horizontal" size={16} color="#9ca3af" />
                </View>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {/* Appointments */}
              <View className="flex-row items-center mb-3">
                <View className="w-1 h-6 bg-blue-500 rounded-full mr-2" />
                <Text className="text-xl font-bold text-gray-800">Appointments</Text>
                <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                  <Text className="text-blue-600 text-xs font-semibold">{staffAppointmentList.length}</Text>
                </View>
              </View>

              {isLoadingAppointments ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="small" color="#ec4899" />
                  <Text className="text-center text-gray-500 mt-2">Loading appointments...</Text>
                </View>
              ) : staffAppointmentList.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                  <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">No appointments found</Text>
                  <Text className="text-gray-400 text-sm text-center mt-1">
                    There are no appointments to display
                  </Text>
                </View>
              ) : (
                staffAppointmentList.map((appointment) => {
                  const grandTotal = appointment.billing_total_amount ?? parseFloat(appointment.price || '0');
                  const paidAmount = appointment.billing_paid_amount ?? 0;
                  const balance = appointment.billing_balance ?? (grandTotal - paidAmount);

                  return (
                    <TouchableOpacity
                      key={appointment.id}
                      className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
                      onPress={() => { setSelectedAppointment(appointment); setShowAppointmentModal(true); }}>
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-gray-800">{appointment.customer_name}</Text>
                          <Text className="text-gray-500 text-sm">{appointment.service_name}</Text>
                          <Text className="text-gray-400 text-xs">
                            {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                          </Text>
                          <View className={`mt-1 px-2 py-0.5 rounded-full self-start ${getStatusColor(appointment.status)}`}>
                            <Text className="text-xs font-semibold capitalize">{appointment.status}</Text>
                          </View>
                          {balance > 0 && (
                            <Text className="text-orange-500 text-xs mt-1">
                              Balance: ₱{balance.toLocaleString()}
                            </Text>
                          )}
                        </View>
                        <Text className="text-pink-500 font-bold">
                          ₱{grandTotal.toLocaleString()}
                        </Text>
                      </View>
                      <View className="flex-row justify-end items-center mt-2 pt-2 border-t border-gray-100">
                        <TouchableOpacity
                          className="bg-blue-100 px-3 py-1.5 rounded-lg"
                          onPress={() => { setSelectedAppointment(appointment); setShowAppointmentModal(true); }}>
                          <Text className="text-blue-700 text-xs font-semibold">View</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    // ── Add Walk-in flow ──
    return (
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="px-5 pt-6">
            {(bookingStep === 'services' || bookingStep === 'confirm') && (
              <TouchableOpacity
                className="flex-row items-center mb-4"
                onPress={bookingStep === 'confirm' ? handleBackToServices : handleBackToStylist}
                disabled={isProcessing}>
                <Ionicons name="arrow-back" size={24} color="#ec4899" />
                <Text className="text-pink-600 font-semibold ml-2">
                  {bookingStep === 'confirm' ? 'Back to Services' : 'Back to Stylists'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="flex-row items-center mb-4"
              onPress={handleBackToManage}
              disabled={isProcessing}>
              <Ionicons name="list-outline" size={24} color="#6b7280" />
              <Text className="text-gray-600 font-semibold ml-2">View My Walk-ins</Text>
            </TouchableOpacity>

            <Text className="text-3xl font-bold text-gray-800 mb-2">
              {bookingStep === 'stylist' ? 'Select Stylist' :
               bookingStep === 'services' ? 'Select Service' :
               'Confirm Walk-in'}
            </Text>
            <Text className="text-gray-500 mb-6">
              {bookingStep === 'stylist' ? 'Choose a stylist for the walk-in customer' :
               bookingStep === 'services' ? `Selected: ${selectedStaff?.first_name} ${selectedStaff?.last_name}` :
               `Review walk-in details`}
            </Text>

            {/* Step 1 */}
            {bookingStep === 'stylist' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ elevation: 2 }}>
                <Text className="text-gray-700 font-semibold mb-2">Customer Name *</Text>
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-700 mb-4"
                />
                <Text className="text-lg font-semibold text-gray-800 mb-4">Select Stylist</Text>
                {isLoading ? (
                  <View className="py-10 items-center">
                    <ActivityIndicator size="large" color="#ec4899" />
                    <Text className="text-center text-gray-500 mt-2">Loading stylists...</Text>
                  </View>
                ) : todayStaff.length === 0 ? (
                  <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                    <Ionicons name="people-outline" size={50} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">No stylists available today</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} className="mb-4">
                    <View className="flex-row flex-wrap justify-between">
                      {todayStaff.map((staffMember) => {
                        const { average, count } = getStaffRating(staffMember.id);
                        const specialties = getStaffSpecialties(staffMember.id);
                        const profileImage = (staffMember as any).profile_image;
                        const isSelected = selectedStaffId === staffMember.id;
                        return (
                          <TouchableOpacity
                            key={staffMember.id}
                            className={`w-[48%] mb-4 ${isSelected ? 'ring-2 ring-pink-500' : ''}`}
                            onPress={() => handleStaffSelect(staffMember.id)}
                            activeOpacity={0.85}
                            disabled={isProcessing}>
                            <View className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ elevation: 4 }}>
                              <View className="relative">
                                {profileImage ? (
                                  <Image source={{ uri: profileImage }} className="w-full h-48" resizeMode="cover" />
                                ) : (
                                  <View className="w-full h-48 bg-gradient-to-br from-pink-400 to-pink-600 items-center justify-center">
                                    <Text className="text-white font-bold text-5xl">
                                      {staffMember.first_name?.charAt(0)}{staffMember.last_name?.charAt(0)}
                                    </Text>
                                  </View>
                                )}
                                {average > 0 && (
                                  <View className="absolute top-3 right-3 bg-black/70 rounded-full px-3 py-1.5 flex-row items-center">
                                    <Ionicons name="star" size={14} color="#fbbf24" />
                                    <Text className="text-white font-bold text-xs ml-1">{average.toFixed(1)}</Text>
                                    <Text className="text-white/70 text-xs ml-1">({count})</Text>
                                  </View>
                                )}
                                <View className="absolute bottom-3 left-3 bg-pink-500 rounded-full px-3 py-1">
                                  <Text className="text-white text-xs font-semibold">Available</Text>
                                </View>
                              </View>
                              <View className="p-3">
                                <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                                  {staffMember.first_name} {staffMember.last_name}
                                </Text>
                                <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>{specialties}</Text>
                                <View className="flex-row items-center mt-2">
                                  {average > 0 ? renderStars(average) : <Text className="text-gray-400 text-xs">No ratings yet</Text>}
                                </View>
                                <View className="mt-3 pt-3 border-t border-gray-100">
                                  <View className={`rounded-full py-2 items-center ${isSelected ? 'bg-pink-600' : 'bg-gray-200'}`}>
                                    <Text className={isSelected ? 'text-white font-semibold text-sm' : 'text-gray-600 text-sm'}>
                                      {isSelected ? '✓ Selected' : 'Select Stylist'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
                <TouchableOpacity
                  className="bg-pink-600 py-4 rounded-xl mt-2"
                  onPress={() => {
                    if (!customerName.trim()) { Alert.alert("Validation Error", "Please enter the customer's name"); return; }
                    if (!selectedStaffId) { Alert.alert("Validation Error", "Please select a stylist"); return; }
                    setBookingStep('services');
                  }}
                  disabled={isProcessing || !selectedStaffId || !customerName.trim()}>
                  <Text className="text-white text-center font-semibold text-lg">Continue to Services</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2 */}
            {bookingStep === 'services' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Selected Stylist</Text>
                  <Text className="text-lg font-bold text-gray-800">
                    {selectedStaff?.first_name} {selectedStaff?.last_name}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">{getStaffSpecialties(selectedStaffId)}</Text>
                </View>
                <Text className="text-lg font-semibold text-gray-800 mb-2">Select Service</Text>
                <Text className="text-gray-500 text-sm mb-4">Choose a service for the walk-in customer</Text>
                {servicesForStaff.length === 0 ? (
                  <View className="py-8 items-center">
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">
                      No services available for this stylist's specialty
                    </Text>
                  </View>
                ) : (
                  servicesForStaff.map((service) => {
                    const isSelected = selectedServiceId === service.id;
                    const isMultitaskable = service.is_multitaskable === 1;
                    return (
                      <TouchableOpacity
                        key={service.id}
                        className={`rounded-2xl p-4 mb-3 border-2 ${isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'}`}
                        onPress={() => handleServiceSelect(service.id)}
                        activeOpacity={0.7}
                        disabled={isProcessing}>
                        <View className="flex-row items-start">
                          <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                          </View>
                          <View className="flex-1">
                            <Text className="text-lg font-semibold text-gray-800">{service.service_name}</Text>
                            <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>{service.description}</Text>
                            <View className="flex-row items-center mt-2">
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1">{service.duration_minutes} mins</Text>
                              {isMultitaskable && (
                                <View className="ml-3 bg-pink-100 px-2 py-0.5 rounded-full">
                                  <Text className="text-pink-600 text-xs">Multitaskable</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Text className="text-pink-600 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
                <TouchableOpacity
                  className="bg-pink-600 py-4 rounded-xl mt-4"
                  onPress={() => {
                    if (!selectedServiceId) { Alert.alert("Selection Required", "Please select a service."); return; }
                    setBookingStep('confirm');
                  }}
                  disabled={!selectedServiceId || isProcessing}>
                  <Text className="text-white text-center font-semibold text-lg">Continue to Confirm</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3 */}
            {bookingStep === 'confirm' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Walk-in Summary</Text>
                  <View className="mt-3">
                    <View className="flex-row justify-between items-center py-1">
                      <Text className="text-gray-600 text-sm">Customer</Text>
                      <Text className="text-gray-800 font-semibold">{customerName}</Text>
                    </View>
                    <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                      <Text className="text-gray-600 text-sm">Stylist</Text>
                      <Text className="text-gray-800 font-semibold">{getStaffName(selectedStaffId)}</Text>
                    </View>
                    <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                      <Text className="text-gray-600 text-sm">Service</Text>
                      <Text className="text-gray-800 font-semibold">{getServiceName()}</Text>
                    </View>
                    <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                      <Text className="text-gray-600 text-sm">Price</Text>
                      <Text className="text-pink-600 font-bold text-lg">₱{totalPrice.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
                <View className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200">
                  <View className="flex-row items-center">
                    <Ionicons name="information-circle-outline" size={20} color="#eab308" />
                    <Text className="text-yellow-700 text-sm ml-2 flex-1">
                      This walk-in will be marked as pending. You can update it later.
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={handleBackToServices} className="flex-1 py-3 rounded-xl border border-gray-300">
                    <Text className="text-gray-600 text-center font-semibold">Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleConfirmWalkIn} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-pink-600">
                    <Text className="text-white text-center font-semibold">
                      {isProcessing ? 'Adding...' : 'Add Walk-in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {renderContent()}
      <WalkInDetailsModal />
      <AppointmentDetailsModal />
      <PaymentProofModal />
    </View>
  );
}