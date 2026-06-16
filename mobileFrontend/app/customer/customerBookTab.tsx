import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import axios from "@/api/axios";

interface ReceiptData {
  bookingId: string;
  serviceName: string;
  date: string;
  time: string;
  stylistName: string;
  totalAmount: number;
  paymentType: string;
  paymentMethod: string;
  amountPaid: number;
  remainingBalance: number;
  status: string;
  bookingDate: string;
}

interface BusinessSchedule {
  id: number;
  business_date: string;
  open_time: string;
  close_time: string;
  is_open: number;
}

interface StaffSpecialty {
  id: number;
  staff_id: number;
  specialty_id: number;
  specialties?: {
    id: number;
    specialty_name: string;
  };
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  staff_specialties?: StaffSpecialty[];
}

interface StaffAssignment {
  id: number;
  staff_id: number;
  business_date_id: number;
  user?: StaffMember;
  business_schedules?: BusinessSchedule;
}

interface CustomerBookingProps {
  onBookingSuccess?: () => void;
}

export default function CustomerBooking({ onBookingSuccess }: CustomerBookingProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [bookingStep, setBookingStep] = useState<'service' | 'datetime' | 'stylist' | 'paymentType' | 'paymentMethod'>('service');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [staffWithSpecialties, setStaffWithSpecialties] = useState<StaffMember[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingStaffSpecialties, setIsLoadingStaffSpecialties] = useState(false);
  
  const availableTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  
  const { 
    user, 
    isLoading, 
    fetchUserAppointments,
    getActiveServices,
    completeBooking,
    fetchStaff,
    staff,
    getStaffBySpecialty,
    fetchServiceSpecialties,
    getServiceSpecialties
  } = useAuth();

  // Fetch business schedules
  const fetchBusinessSchedules = async () => {
    setIsLoadingSchedules(true);
    try {
      const response = await axios.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching business schedules:', error);
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  // Fetch staff assignments (which staff are assigned to which schedules)
  const fetchStaffAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      const response = await axios.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      if (Array.isArray(response.data)) {
        setStaffAssignments(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // Fetch staff with their specialties from the new route
  const fetchStaffWithSpecialties = async () => {
    setIsLoadingStaffSpecialties(true);
    try {
      const response = await axios.get('/employee/specialties');
      console.log('Fetched staff with specialties:', response.data);
      if (Array.isArray(response.data)) {
        setStaffWithSpecialties(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff with specialties:', error);
    } finally {
      setIsLoadingStaffSpecialties(false);
    }
  };

  // Get schedule for a specific date
  const getScheduleForDate = (dateStr: string): BusinessSchedule | null => {
    return businessSchedules.find(schedule => schedule.business_date === dateStr) || null;
  };

  // Get staff assigned to a specific date
  const getStaffAssignedToDate = (dateStr: string): StaffAssignment[] => {
    const schedule = getScheduleForDate(dateStr);
    if (!schedule) return [];
    
    return staffAssignments.filter(assignment => assignment.business_date_id === schedule.id);
  };

  // Check if a date is bookable (has schedule and is open)
  const isDateBookable = (date: Date): boolean => {
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const schedule = getScheduleForDate(dateStr);
    
    if (!schedule) return false;
    if (schedule.is_open !== 1) return false;
    return true;
  };

  // Get schedule status for display
  const getScheduleStatus = (date: Date): { status: 'open' | 'closed' | 'no_schedule'; schedule: BusinessSchedule | null } => {
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const schedule = getScheduleForDate(dateStr);
    
    if (!schedule) return { status: 'no_schedule', schedule: null };
    if (schedule.is_open === 1) return { status: 'open', schedule };
    return { status: 'closed', schedule };
  };

  // Get required specialty for a service from the service_specialties table
  const getRequiredSpecialtyForService = (serviceId: number): string | null => {
    const serviceSpecialties = getServiceSpecialties(serviceId);
    if (serviceSpecialties && serviceSpecialties.length > 0) {
      return serviceSpecialties[0]?.specialties?.specialty_name || null;
    }
    return null;
  };

  // Get staff member details including specialties
  const getStaffMemberWithSpecialties = (staffId: number): StaffMember | null => {
    return staffWithSpecialties.find(staff => staff.id === staffId) || null;
  };

  // Check if staff has required specialty
  const hasStaffRequiredSpecialty = (staffMember: StaffMember, requiredSpecialty: string | null): boolean => {
    if (!requiredSpecialty) return true;
    
    if (!staffMember.staff_specialties || staffMember.staff_specialties.length === 0) {
      return false;
    }
    
    return staffMember.staff_specialties.some((specialty: StaffSpecialty) => 
      specialty.specialties?.specialty_name?.toLowerCase() === requiredSpecialty.toLowerCase()
    );
  };

  // Filter staff based on:
  // 1. Staff assigned to the selected date
  // 2. Service requirement specialty (using staffWithSpecialties data)
  const getFilteredStaff = () => {
    if (!selectedServiceId || !selectedDate) return [];
    
    const dateStr = `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(selectedDate.getUTCDate()).padStart(2, '0')}`;
    const assignedStaffForDate = getStaffAssignedToDate(dateStr);
    
    console.log(`Staff assigned to ${dateStr}:`, assignedStaffForDate.length);
    
    const requiredSpecialty = getRequiredSpecialtyForService(selectedServiceId);
    console.log(`Service ID: ${selectedServiceId}, Required specialty: ${requiredSpecialty}`);
    
    // If no staff assigned to this date, return empty array
    if (assignedStaffForDate.length === 0) {
      console.log('No staff assigned to this date');
      return [];
    }
    
    // Filter assigned staff based on specialty requirement using staffWithSpecialties
    const filteredStaff = assignedStaffForDate.filter(assignment => {
      const staffId = assignment.staff_id;
      // Get staff member from the specialties data
      const staffMember = getStaffMemberWithSpecialties(staffId);
      
      if (!staffMember) {
        console.log(`Staff ID ${staffId} not found in specialties data`);
        return false;
      }
      
      // Check if staff has the required specialty
      const hasSpecialty = hasStaffRequiredSpecialty(staffMember, requiredSpecialty);
      
      if (hasSpecialty) {
        console.log(`Staff ${staffMember.first_name} ${staffMember.last_name} has required specialty: ${requiredSpecialty}`);
      } else {
        console.log(`Staff ${staffMember.first_name} ${staffMember.last_name} does NOT have required specialty: ${requiredSpecialty}`);
      }
      
      return hasSpecialty;
    });
    
    console.log(`Filtered staff after specialty check:`, filteredStaff.length);
    return filteredStaff;
  };

  // Get staff name by ID (from staffWithSpecialties data)
  const getStaffName = (staffId: number | null) => {
    if (!staffId) return '';
    const staffMember = getStaffMemberWithSpecialties(staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : '';
  };

  // Get staff specialties as string (from staffWithSpecialties data)
  const getStaffSpecialtiesString = (staffId: number | null) => {
    if (!staffId) return 'No specialties assigned';
    const staffMember = getStaffMemberWithSpecialties(staffId);
    
    if (!staffMember?.staff_specialties || staffMember.staff_specialties.length === 0) {
      return 'No specialties assigned';
    }
    
    return staffMember.staff_specialties
      .map((specialty: StaffSpecialty) => {
        const name = specialty.specialties?.specialty_name;
        return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  // Generate receipt number
  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}${day}-${random}`;
  };

  // Get computed data
  const activeServices = getActiveServices();
  const selectedService = selectedServiceId ? activeServices.find(s => s.id === selectedServiceId) : null;
  
  const getServicePrice = () => {
    return selectedService?.price || 0;
  };

  const getAmount = () => {
    const totalPrice = getServicePrice();
    if (selectedPaymentType === 'downpayment') {
      return totalPrice / 2;
    }
    return totalPrice;
  };

  const getPaymentTypeLabel = () => {
    if (selectedPaymentType === 'downpayment') {
      return 'Downpayment (50%)';
    } else if (selectedPaymentType === 'full payment') {
      return 'Full Payment (100%)';
    }
    return '';
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDay.getUTCDate();
    const startingDayOfWeek = firstDay.getUTCDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(Date.UTC(year, month, i)));
    }
    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const changeMonth = (increment: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return dateUTC.getTime() === todayUTC.getTime();
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return dateUTC < todayUTC;
  };

  const getTimeSlotsForDate = (date: Date): string[] => {
    const scheduleStatus = getScheduleStatus(date);
    if (scheduleStatus.status !== 'open' || !scheduleStatus.schedule) {
      return [];
    }
    
    const { open_time, close_time } = scheduleStatus.schedule;
    const allTimeSlots = [...availableTimes];
    const openHour = parseInt(open_time.split(':')[0]);
    const closeHour = parseInt(close_time.split(':')[0]);
    
    return allTimeSlots.filter(time => {
      const hour = parseInt(time.split(':')[0]);
      return hour >= openHour && hour < closeHour;
    });
  };

  const handleDateSelect = (date: Date) => {
    if (isPastDate(date)) {
      Alert.alert("Invalid Date", "Cannot select past dates. Please choose today or a future date.");
      return;
    }
    
    if (!isDateBookable(date)) {
      const scheduleStatus = getScheduleStatus(date);
      if (scheduleStatus.status === 'no_schedule') {
        Alert.alert("No Schedule", "This date has no business schedule set. Please select another date.");
      } else if (scheduleStatus.status === 'closed') {
        Alert.alert("Salon Closed", "The salon is closed on this date. Please select another date.");
      }
      return;
    }
    
    setSelectedDateForModal(date);
    setShowTimePickerModal(true);
  };

  const handleTimeSelect = (time: string) => {
    const [hours, minutes] = time.split(':');
    const newDateTime = new Date(selectedDateForModal!);
    newDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
    setSelectedDate(newDateTime);
    setSelectedTime(newDateTime);
    setShowTimePickerModal(false);
    setSelectedDateForModal(null);
    
    setBookingStep('stylist');
  };

  const handleSelectService = (serviceId: number) => {
    setSelectedServiceId(selectedServiceId === serviceId ? null : serviceId);
  };

  const handleContinueToDateTime = () => {
    if (!selectedServiceId) {
      Alert.alert("Selection Required", "Please select a service first.");
      return;
    }
    setBookingStep('datetime');
  };

  const handleContinueToStylist = () => {
    if (!selectedDate) {
      Alert.alert("Selection Required", "Please select a date and time first.");
      return;
    }
    
    // Check if there are any staff assigned to this date
    const dateStr = `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(selectedDate.getUTCDate()).padStart(2, '0')}`;
    const assignedStaffForDate = getStaffAssignedToDate(dateStr);
    
    if (assignedStaffForDate.length === 0) {
      Alert.alert("No Staff Available", "No staff members are assigned to work on this date. Please select another date.");
      return;
    }
    
    setBookingStep('stylist');
  };

  const handleContinueToPaymentType = () => {
    if (!selectedStaffId) {
      Alert.alert("Selection Required", "Please select a preferred stylist.");
      return;
    }
    setBookingStep('paymentType');
  };

  const handleContinueToPaymentMethod = () => {
    if (!selectedPaymentType) {
      Alert.alert("Selection Required", "Please select a payment type.");
      return;
    }
    setBookingStep('paymentMethod');
  };

  const handleConfirmBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Selection Required", "Please select a payment method.");
      return;
    }

    if (!selectedStaffId) {
      Alert.alert("Selection Required", "Please select a stylist first.");
      return;
    }

    setIsProcessing(true);

    try {
      const formattedTime = selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const appointmentDate = `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(selectedDate.getUTCDate()).padStart(2, '0')}`;
      
      const bookingData = {
        appointment_date: appointmentDate,
        appointment_time: formattedTime,
        status: 'pending',
        service_id: selectedServiceId || 0,
        assigned_employee_id: selectedStaffId,
        service_status: 'pending',
        total_amount: getServicePrice(),
        payment_type: selectedPaymentType || '',
        payment_method: selectedPaymentMethod || '',
        customer_id: user?.id || 0
      };
      
      console.log("Submitting booking with data:", bookingData);
      
      const result = await completeBooking(bookingData);

      const amount = getAmount();
      const paymentTypeLabel = getPaymentTypeLabel();
      const totalPrice = getServicePrice();
      const paymentMethodLabel = selectedPaymentMethod === 'gcash' ? 'GCash' : 'Cash';
      const staffName = getStaffName(selectedStaffId);
      const receiptNumber = generateReceiptNumber();
      const remainingBalance = selectedPaymentType === 'downpayment' ? totalPrice - amount : 0;

      const receipt: ReceiptData = {
        bookingId: result.appointment_id?.toString() || receiptNumber,
        serviceName: selectedService?.service_name || '',
        date: selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: formattedTime,
        stylistName: staffName,
        totalAmount: totalPrice,
        paymentType: paymentTypeLabel,
        paymentMethod: paymentMethodLabel,
        amountPaid: amount,
        remainingBalance: remainingBalance,
        status: 'Pending Confirmation',
        bookingDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setReceiptData(receipt);
      setShowReceipt(true);

    } catch (error: any) {
      console.error("Booking error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to complete booking. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setBookingStep('service');
    setSelectedServiceId(null);
    setSelectedStaffId(null);
    setSelectedPaymentType(null);
    setSelectedPaymentMethod(null);
    if (onBookingSuccess) {
      onBookingSuccess();
    }
  };

  const handleBackToServices = () => {
    setBookingStep('service');
  };

  const handleBackToDateTime = () => {
    setBookingStep('datetime');
  };

  const handleBackToStylist = () => {
    setBookingStep('stylist');
  };

  const handleBackToPaymentType = () => {
    setBookingStep('paymentType');
  };

  // Fetch data on mount
  useEffect(() => {
    fetchStaff();
    fetchServiceSpecialties();
    fetchBusinessSchedules();
    fetchStaffAssignments();
    fetchStaffWithSpecialties(); // Fetch staff with specialties from the new route
  }, []);

  // Stylist Selection Modal
  const StylistModal = () => {
    const filteredStaff = getFilteredStaff();
    const requiredSpecialty = selectedServiceId ? getRequiredSpecialtyForService(selectedServiceId) : null;
    const dateStr = selectedDate ? `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(selectedDate.getUTCDate()).padStart(2, '0')}` : '';
    const assignedStaffForDate = getStaffAssignedToDate(dateStr);
    
    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showStaffModal}
        onRequestClose={() => setShowStaffModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-800">
                Select Stylist
              </Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            <View className="bg-blue-50 p-3 rounded-xl mb-4">
              <Text className="text-sm text-blue-600">
                Showing staff available on {selectedDate?.toLocaleDateString()}
              </Text>
            </View>
            
            {requiredSpecialty && (
              <View className="bg-pink-50 p-3 rounded-xl mb-4">
                <Text className="text-sm text-pink-600">
                  Required: {requiredSpecialty.charAt(0).toUpperCase() + requiredSpecialty.slice(1)}
                </Text>
              </View>
            )}
            
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
              {isLoadingStaffSpecialties ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="large" color="#ec4899" />
                  <Text className="text-gray-500 mt-3">Loading staff...</Text>
                </View>
              ) : filteredStaff.length === 0 ? (
                <View className="py-8 items-center">
                  <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">
                    {assignedStaffForDate.length === 0 
                      ? "No staff assigned to work on this date. Please select another date."
                      : `No ${requiredSpecialty ? requiredSpecialty + 's' : 'stylists'} available for this service on this date`}
                  </Text>
                </View>
              ) : (
                filteredStaff.map((assignment) => {
                  const staffId = assignment.staff_id;
                  const staffMember = getStaffMemberWithSpecialties(staffId);
                  if (!staffMember) return null;
                  
                  const specialties = getStaffSpecialtiesString(staffId);
                  
                  return (
                    <TouchableOpacity
                      key={staffMember.id}
                      className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
                        selectedStaffId === staffMember.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                      }`}
                      onPress={() => {
                        console.log("Selected staff ID:", staffMember.id);
                        setSelectedStaffId(staffMember.id);
                        setShowStaffModal(false);
                      }}
                    >
                      <View className="flex-row items-center flex-1">
                        <View className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full items-center justify-center mr-3">
                          <Text className="text-white font-bold text-lg">
                            {staffMember.first_name?.charAt(0)}{staffMember.last_name?.charAt(0)}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-800 font-semibold">
                            {staffMember.first_name} {staffMember.last_name}
                          </Text>
                          <Text className="text-gray-500 text-xs">
                            {specialties}
                          </Text>
                        </View>
                      </View>
                      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        selectedStaffId === staffMember.id ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                      }`}>
                        {selectedStaffId === staffMember.id && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Time Picker Modal
  const TimePickerModal = () => {
    const availableTimeSlots = selectedDateForModal ? getTimeSlotsForDate(selectedDateForModal) : [];
    
    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showTimePickerModal}
        onRequestClose={() => {
          setShowTimePickerModal(false);
          setSelectedDateForModal(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-800">
                Select Time for {selectedDateForModal?.toLocaleDateString()}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowTimePickerModal(false);
                setSelectedDateForModal(null);
              }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            {availableTimeSlots.length === 0 ? (
              <View className="py-8 items-center">
                <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-center mt-3">
                  No available time slots for this date
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
                <View className="flex-row flex-wrap justify-between">
                  {availableTimeSlots.map((time) => (
                    <TouchableOpacity
                      key={time}
                      className="w-[30%] py-3 mb-3 rounded-xl border border-gray-200 items-center"
                      style={{
                        backgroundColor: selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) === time ? '#ec4899' : 'white'
                      }}
                      onPress={() => handleTimeSelect(time)}
                    >
                      <Text className={selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) === time ? 'text-white font-semibold' : 'text-gray-700'}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Receipt Modal Component
  const ReceiptModal = () => {
    if (!receiptData) return null;

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showReceipt}
        onRequestClose={handleCloseReceipt}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <ScrollView className="max-h-[90%]" showsVerticalScrollIndicator={false}>
            <View className="bg-white rounded-2xl overflow-hidden w-full" style={{ minWidth: 320 }}>
              <View className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 items-center">
                <Text className="text-white text-2xl font-bold mb-1">💇‍♀️ Salon Bliss</Text>
                <Text className="text-white opacity-90 text-sm">Official Receipt</Text>
                <View className="bg-white/20 rounded-full px-3 py-1 mt-2">
                  <Text className="text-white text-xs font-mono">{receiptData.bookingId}</Text>
                </View>
              </View>

              <View className="p-6">
                <View className="bg-yellow-50 rounded-xl p-3 mb-4 items-center border border-yellow-200">
                  <Text className="text-yellow-700 font-semibold text-sm">{receiptData.status}</Text>
                  <Text className="text-gray-500 text-xs mt-1">Thank you for booking with us!</Text>
                </View>

                <View className="border-b border-gray-200 pb-3 mb-3">
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Booking Details</Text>
                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Service</Text>
                      <Text className="text-gray-800 font-semibold text-sm">{receiptData.serviceName}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Date</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.date}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Time</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.time}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Stylist</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.stylistName}</Text>
                    </View>
                  </View>
                </View>

                <View className="border-b border-gray-200 pb-3 mb-3">
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Payment Details</Text>
                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Total Amount</Text>
                      <Text className="text-gray-800 font-semibold text-sm">₱{receiptData.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Payment Type</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.paymentType}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Payment Method</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.paymentMethod}</Text>
                    </View>
                    <View className="flex-row justify-between pt-2 border-t border-dashed border-gray-200">
                      <Text className="text-gray-600 text-sm font-semibold">Amount Paid</Text>
                      <Text className="text-green-600 font-bold text-base">₱{receiptData.amountPaid.toLocaleString()}</Text>
                    </View>
                    {receiptData.remainingBalance > 0 && (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600 text-sm">Remaining Balance</Text>
                        <Text className="text-orange-600 font-semibold text-sm">₱{receiptData.remainingBalance.toLocaleString()}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="bg-gray-50 rounded-xl p-3 mb-4">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="information-circle-outline" size={16} color="#ec4899" />
                    <Text className="text-gray-500 text-xs flex-1">
                      Please arrive 10 minutes before your scheduled time. 
                      {receiptData.remainingBalance > 0 && ' The remaining balance can be paid at the salon.'}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-400 text-center text-xs border-t border-gray-100 pt-3">
                  Booked on {receiptData.bookingDate}
                </Text>
              </View>

              <View className="border-t border-pink-100 px-6 py-4 flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 py-3 rounded-xl border border-pink-500"
                  onPress={handleCloseReceipt}
                >
                  <Text className="text-pink-500 text-center font-semibold">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 py-3 rounded-xl bg-pink-500"
                  onPress={handleCloseReceipt}
                >
                  <Text className="text-white text-center font-semibold">View My Bookings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    const totalPrice = getServicePrice();
    const downpaymentAmount = totalPrice / 2;
    const fullPaymentAmount = totalPrice;
    const requiredSpecialty = selectedServiceId ? getRequiredSpecialtyForService(selectedServiceId) : null;
    const dateStr = selectedDate ? `${selectedDate.getUTCFullYear()}-${String(selectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(selectedDate.getUTCDate()).padStart(2, '0')}` : '';
    const assignedStaffCount = getStaffAssignedToDate(dateStr).length;
    
    return (
      <View className="flex-1">
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          className="flex-1"
        >
          <View className="px-5 pt-6">
            {/* Back Button */}
            {(bookingStep === 'datetime' || bookingStep === 'stylist' || bookingStep === 'paymentType' || bookingStep === 'paymentMethod') && (
              <TouchableOpacity 
                className="flex-row items-center mb-4"
                onPress={
                  bookingStep === 'paymentMethod' ? handleBackToPaymentType :
                  bookingStep === 'paymentType' ? handleBackToStylist :
                  bookingStep === 'stylist' ? handleBackToDateTime : 
                  handleBackToServices
                }
                disabled={isProcessing}
              >
                <Ionicons name="arrow-back" size={24} color="#ec4899" />
                <Text className="text-pink-500 font-semibold ml-2">
                  {bookingStep === 'paymentMethod' ? 'Back to Payment Type' : 
                   bookingStep === 'paymentType' ? 'Back to Stylist' :
                   bookingStep === 'stylist' ? 'Back to Calendar' : 'Back to Services'}
                </Text>
              </TouchableOpacity>
            )}
            
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              {bookingStep === 'service' ? 'Book Appointment' : 
               bookingStep === 'datetime' ? 'Select Date & Time' :
               bookingStep === 'stylist' ? 'Select Preferred Stylist' :
               bookingStep === 'paymentType' ? 'Select Payment Type' : 'Select Payment Method'}
            </Text>
            <Text className="text-gray-500 mb-6">
              {bookingStep === 'service' ? 'Choose a service to get started' : 
               bookingStep === 'datetime' ? `Selected: ${selectedService?.service_name}` :
               bookingStep === 'stylist' ? `Selected Date: ${selectedDate.toLocaleDateString()} at ${selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` :
               bookingStep === 'paymentType' ? `Selected Stylist: ${getStaffName(selectedStaffId)}` :
               `Complete your booking`}
            </Text>
            
            {/* Step 1: Service Selection */}
            {bookingStep === 'service' && (
              <>
                {isLoading ? (
                  <View className="py-10">
                    <Text className="text-center text-gray-500">Loading services...</Text>
                  </View>
                ) : activeServices.length === 0 ? (
                  <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                    <Ionicons name="cut-outline" size={50} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">No services available</Text>
                  </View>
                ) : (
                  <>
                    {activeServices.map((service) => (
                      <TouchableOpacity 
                        key={service.id} 
                        className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border-2 ${
                          selectedServiceId === service.id ? 'border-pink-500' : 'border-transparent'
                        }`}
                        onPress={() => handleSelectService(service.id)}
                        activeOpacity={0.7}
                        disabled={isProcessing}
                      >
                        <View className="flex-row items-start">
                          <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${
                            selectedServiceId === service.id ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                          }`}>
                            {selectedServiceId === service.id && (
                              <Ionicons name="checkmark" size={14} color="white" />
                            )}
                          </View>
                          
                          <View className="flex-1">
                            <Text className="text-lg font-semibold text-gray-800">{service.service_name}</Text>
                            <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                              {service.description}
                            </Text>
                            <View className="flex-row items-center mt-2">
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1">{service.duration_minutes} mins</Text>
                            </View>
                          </View>
                          <Text className="text-pink-500 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    
                    {selectedServiceId && (
                      <TouchableOpacity 
                        className="bg-pink-500 py-4 rounded-xl mt-4 mb-6"
                        onPress={handleContinueToDateTime}
                        disabled={isProcessing}
                      >
                        <Text className="text-white text-center font-semibold text-lg">Continue to Date Selection</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}
            
            {/* Step 2: Calendar + Time Selection */}
            {bookingStep === 'datetime' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Selected Service</Text>
                  <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-gray-500 text-sm">{selectedService?.duration_minutes} mins</Text>
                    <Text className="text-pink-500 font-bold">₱{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>
                
                {/* Legend */}
                <View className="flex-row justify-around mb-4 pb-3 border-b border-gray-100">
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-green-500" />
                    <Text className="text-xs text-gray-600">Open</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-red-500" />
                    <Text className="text-xs text-gray-600">Closed</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-gray-300" />
                    <Text className="text-xs text-gray-600">No Schedule</Text>
                  </View>
                </View>
                
                {/* Calendar Header */}
                <View className="flex-row justify-between items-center mb-4">
                  <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2">
                    <Ionicons name="chevron-back" size={24} color="#ec4899" />
                  </TouchableOpacity>
                  <Text className="text-lg font-semibold text-gray-800">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
                    <Ionicons name="chevron-forward" size={24} color="#ec4899" />
                  </TouchableOpacity>
                </View>

                {/* Week Days Header */}
                <View className="flex-row mb-2">
                  {weekDays.map((day, index) => (
                    <View key={index} className="flex-1 items-center py-2">
                      <Text className="text-gray-500 text-xs font-medium">{day}</Text>
                    </View>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View className="flex-row flex-wrap">
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) {
                      return <View key={`empty-${index}`} className="w-[14.28%] aspect-square p-1" />;
                    }
                    
                    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                    const todayUTC = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
                    const isSelected = selectedDate && 
                      dateUTC.getTime() === new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())).getTime();
                    const isTodayDate = dateUTC.getTime() === todayUTC.getTime();
                    const isPast = dateUTC < todayUTC;
                    const scheduleStatus = getScheduleStatus(date);
                    const isBookable = isDateBookable(date);
                    
                    let cellBgColor = 'bg-gray-50';
                    let indicatorColor = null;
                    
                    if (!isPast) {
                      if (scheduleStatus.status === 'open') {
                        cellBgColor = 'bg-green-50';
                        indicatorColor = 'bg-green-500';
                      } else if (scheduleStatus.status === 'closed') {
                        cellBgColor = 'bg-red-50';
                        indicatorColor = 'bg-red-500';
                      } else {
                        cellBgColor = 'bg-gray-100';
                        indicatorColor = 'bg-gray-400';
                      }
                    } else {
                      cellBgColor = 'bg-gray-100';
                    }
                    
                    const dayNumber = date.getUTCDate();
                    
                    return (
                      <TouchableOpacity
                        key={date.toISOString()}
                        className={`w-[14.28%] aspect-square p-1 ${isPast ? 'opacity-40' : ''}`}
                        onPress={() => !isPast && handleDateSelect(date)}
                        disabled={isPast || !isBookable}
                      >
                        <View className={`flex-1 items-center justify-center rounded-full ${cellBgColor} ${isSelected ? 'ring-2 ring-pink-500' : ''}`}>
                          <Text className={`text-sm ${
                            isSelected ? 'text-pink-600 font-bold' : 
                            isTodayDate ? 'text-pink-600 font-semibold' : 
                            isPast ? 'text-gray-400' : 
                            scheduleStatus.status === 'open' ? 'text-green-700' :
                            scheduleStatus.status === 'closed' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {dayNumber}
                          </Text>
                          {indicatorColor && !isSelected && (
                            <View className={`w-1.5 h-1.5 rounded-full ${indicatorColor} mt-0.5`} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected Date Display */}
                {selectedDate && (
                  <View className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <Text className="text-gray-600 text-sm">Selected Date</Text>
                    <Text className="text-lg font-bold text-gray-800">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                    {selectedTime && (
                      <View className="flex-row items-center mt-2">
                        <Ionicons name="time-outline" size={16} color="#ec4899" />
                        <Text className="text-pink-600 font-semibold ml-1">
                          {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="people-outline" size={14} color="#9ca3af" />
                      <Text className="text-gray-500 text-xs ml-1">
                        {assignedStaffCount} staff member(s) available on this date
                      </Text>
                    </View>
                  </View>
                )}

                {/* Change Time Button */}
                {selectedDate && (
                  <TouchableOpacity 
                    className="flex-row items-center justify-center py-3 mt-3 border border-pink-500 rounded-xl"
                    onPress={() => {
                      setSelectedDateForModal(selectedDate);
                      setShowTimePickerModal(true);
                    }}
                  >
                    <Ionicons name="time-outline" size={20} color="#ec4899" />
                    <Text className="text-pink-500 font-semibold ml-2">Change Time</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  className="bg-pink-500 py-4 rounded-xl mt-4"
                  onPress={handleContinueToStylist}
                  disabled={!selectedDate || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Stylist Selection
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Step 3: Stylist Selection */}
            {bookingStep === 'stylist' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Appointment Summary</Text>
                  <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Time: {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Text className="text-pink-500 font-bold">₱{totalPrice.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Available Stylists: {assignedStaffCount}</Text>
                  </View>
                </View>

                <Text className="text-lg font-semibold text-gray-800 mb-3">Select Preferred Stylist</Text>
                
                {requiredSpecialty && (
                  <View className="bg-blue-50 p-3 rounded-xl mb-4">
                    <Text className="text-sm text-blue-600">
                      This service requires a {requiredSpecialty.charAt(0).toUpperCase() + requiredSpecialty.slice(1)}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  className="flex-row items-center justify-between p-4 border border-gray-200 rounded-xl"
                  onPress={() => setShowStaffModal(true)}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="person-outline" size={20} color="#ec4899" />
                    <Text className="ml-3 text-gray-700">
                      {selectedStaffId ? getStaffName(selectedStaffId) : 'Select a stylist...'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                
                {selectedStaffId && (
                  <View className="mt-4 p-3 bg-green-50 rounded-xl">
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text className="text-green-600 text-sm ml-2">
                        {getStaffName(selectedStaffId)} will be your stylist
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  className="bg-pink-500 py-4 rounded-xl mt-6"
                  onPress={handleContinueToPaymentType}
                  disabled={!selectedStaffId || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Payment Type
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Step 4: Payment Type Selection */}
            {bookingStep === 'paymentType' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Booking Summary</Text>
                  <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Time: {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Stylist: {getStaffName(selectedStaffId)}</Text>
                    <Text className="text-pink-500 font-bold">₱{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>

                <Text className="text-lg font-semibold text-gray-800 mb-3">How would you like to pay?</Text>
                <Text className="text-gray-500 text-sm mb-4">Choose your payment arrangement</Text>
                
                {/* Downpayment Option */}
                <TouchableOpacity 
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border-2 ${
                    selectedPaymentType === 'downpayment' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setSelectedPaymentType('downpayment')}
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="card-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold">Downpayment (50%)</Text>
                      <Text className="text-gray-500 text-xs">Pay ₱{downpaymentAmount.toLocaleString()} now</Text>
                    </View>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedPaymentType === 'downpayment' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                  }`}>
                    {selectedPaymentType === 'downpayment' && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Full Payment Option */}
                <TouchableOpacity 
                  className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                    selectedPaymentType === 'full payment' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setSelectedPaymentType('full payment')}
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="cash-outline" size={20} color="#10b981" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold">Full Payment (100%)</Text>
                      <Text className="text-gray-500 text-xs">Pay ₱{fullPaymentAmount.toLocaleString()} now</Text>
                    </View>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedPaymentType === 'full payment' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                  }`}>
                    {selectedPaymentType === 'full payment' && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                {selectedPaymentType && (
                  <View className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <Text className="text-gray-600 text-sm">Amount Due: ₱{getAmount().toLocaleString()}</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  className="bg-pink-500 py-4 rounded-xl mt-6"
                  onPress={handleContinueToPaymentMethod}
                  disabled={isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">Continue to Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Step 5: Payment Method Selection */}
            {bookingStep === 'paymentMethod' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Booking Summary</Text>
                  <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Time: {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Stylist: {getStaffName(selectedStaffId)}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Payment Type: {getPaymentTypeLabel()}</Text>
                    <Text className="text-pink-500 font-bold">₱{getAmount().toLocaleString()}</Text>
                  </View>
                </View>

                <Text className="text-lg font-semibold text-gray-800 mb-3">Select Payment Method</Text>
                <Text className="text-gray-500 text-sm mb-4">Choose how you want to complete the payment</Text>
                
                {/* GCash Option */}
                <TouchableOpacity 
                  className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border-2 ${
                    selectedPaymentMethod === 'gcash' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setSelectedPaymentMethod('gcash')}
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="phone-portrait-outline" size={20} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold">GCash</Text>
                      <Text className="text-gray-500 text-xs">Pay via GCash wallet</Text>
                    </View>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedPaymentMethod === 'gcash' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                  }`}>
                    {selectedPaymentMethod === 'gcash' && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Cash Option */}
                <TouchableOpacity 
                  className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                    selectedPaymentMethod === 'cash' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setSelectedPaymentMethod('cash')}
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="cash-outline" size={20} color="#10b981" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold">Cash</Text>
                      <Text className="text-gray-500 text-xs">Pay in cash at the salon</Text>
                    </View>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedPaymentMethod === 'cash' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                  }`}>
                    {selectedPaymentMethod === 'cash' && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                {selectedPaymentMethod && (
                  <View className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <Text className="text-gray-600 text-sm">Total Payment: ₱{getAmount().toLocaleString()}</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  className="bg-pink-500 py-4 rounded-xl mt-6"
                  onPress={handleConfirmBooking}
                  disabled={isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    {isProcessing ? 'Processing...' : 'Confirm Booking'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        <StylistModal />
        <TimePickerModal />
        <ReceiptModal />
      </View>
    );
  };

  return renderContent();
}