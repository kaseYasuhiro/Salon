import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

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

interface Appointment {
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
  assigned_employee_id?: number;
  service_name: string;
  duration_minutes: number;
  price: string;
}

interface CustomerBookingProps {
  onBookingSuccess?: () => void;
}

export default function CustomerBooking({ onBookingSuccess }: CustomerBookingProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [bookingStep, setBookingStep] = useState<'stylist' | 'services' | 'datetime' | 'paymentType' | 'paymentMethod'>('stylist');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  // Local state for data from API
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSpecialties, setServiceSpecialties] = useState<any[]>([]);
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState<StaffFeedback[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Maximum appointments per time slot
  const MAX_APPOINTMENTS_PER_TIME = 3;
  
  const { 
    user,
  } = useAuth();

  // Fetch staff
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      console.log("Fetched staff with specialties:", response.data);
      
      let staffData: StaffMember[] = [];
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
    } catch (error) {
      console.log("Error fetching services:", error);
      return [];
    }
  };

  // Fetch service specialties
  const fetchServiceSpecialties = async () => {
    try {
      const response = await api.get("/services/specialties");
      console.log("Fetched service specialties:", response.data);
      
      let specialtiesData: any[] = [];
      if (Array.isArray(response.data)) {
        specialtiesData = response.data;
      }
      
      setServiceSpecialties(specialtiesData);
      return specialtiesData;
    } catch (error) {
      console.log("Error fetching service specialties:", error);
      return [];
    }
  };

  // Fetch business schedules
  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      let schedulesData: BusinessSchedule[] = [];
      if (Array.isArray(response.data)) {
        schedulesData = response.data;
      }
      setBusinessSchedules(schedulesData);
      return schedulesData;
    } catch (error) {
      console.error('Error fetching business schedules:', error);
      return [];
    }
  };

  // Fetch staff assignments
  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      let assignmentsData: StaffAssignment[] = [];
      if (Array.isArray(response.data)) {
        assignmentsData = response.data;
      }
      setStaffAssignments(assignmentsData);
      return assignmentsData;
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
      return [];
    }
  };

  // Fetch staff feedbacks
  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get("/feedbacks/staff");
      console.log("Raw staff feedbacks response:", response.data);
      
      let staffFeedbacksData: StaffFeedback[] = [];
      if (Array.isArray(response.data)) {
        staffFeedbacksData = response.data.map((item: any) => ({
          id: item.id || 0,
          staff_id: item.staff_id || 0,
          rating: parseFloat(item.rating) || 0
        }));
      }
      
      console.log("Processed staff feedbacks:", staffFeedbacksData);
      setStaffFeedbacks(staffFeedbacksData);
      return staffFeedbacksData;
    } catch (error) {
      console.log("Error fetching staff feedbacks:", error);
      return [];
    }
  };

  // Fetch all appointments
  const fetchAllAppointments = async () => {
    try {
      const response = await api.get('/all-appointments');
      console.log('Fetched all appointments:', response.data);
      
      let appointmentsData: Appointment[] = [];
      if (Array.isArray(response.data)) {
        appointmentsData = response.data.map((item: any) => ({
          id: item.id,
          appointment_id: item.appointment_id,
          service_id: item.service_id,
          customer_name: item.customer_name,
          customer_phone: item.customer_phone,
          customer_email: item.customer_email,
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time,
          status: item.status,
          service_status: item.service_status,
          assigned_employee_id: item.assigned_employee_id,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price
        }));
      }
      
      console.log('Processed appointments:', appointmentsData);
      setAllAppointments(appointmentsData);
      return appointmentsData;
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      return [];
    }
  };

  // Complete booking
  const completeBooking = async (data: any) => {
    try {
      const response = await api.post("/booking/complete", data);
      console.log("Booking completed:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error completing booking:", error);
      throw error;
    }
  };

  // Load all data on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchStaff(),
      fetchServices(),
      fetchServiceSpecialties(),
      fetchBusinessSchedules(),
      fetchStaffAssignments(),
      fetchStaffFeedbacks(),
      fetchAllAppointments()
    ]).finally(() => setIsLoading(false));
  }, []);

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

  // Check if staff is available on a specific date
  const isStaffAvailableOnDate = (staffId: number, date: Date): boolean => {
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const assignedStaff = getStaffAssignedToDate(dateStr);
    return assignedStaff.some(assignment => assignment.staff_id === staffId);
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

  // Get active services
  const getActiveServices = () => {
    return services.filter(service => service.service_status === 'active');
  };

  // Get services based on staff's specialty
  const getServicesForStaff = () => {
    if (!selectedStaffId) return [];
    
    const selectedStaff = staff.find(s => s.id === selectedStaffId);
    if (!selectedStaff) return [];
    
    // Get all specialties of the selected staff
    const staffSpecialties = selectedStaff.staff_specialties
      ?.filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name?.toLowerCase()) || [];
    
    // Get all active services
    const activeServices = getActiveServices();
    
    // Filter services that match the staff's specialties
    return activeServices.filter(service => {
      const serviceSpecialties = getServiceSpecialties(service.id);
      return serviceSpecialties.some(ss => {
        const specialtyName = ss.specialties?.specialty_name?.toLowerCase();
        return staffSpecialties.includes(specialtyName);
      });
    });
  };

  // Get service specialties
  const getServiceSpecialties = (serviceId: number) => {
    return serviceSpecialties.filter(item => item.service_id === serviceId);
  };

  // Check if selected services are multitaskable
  const areServicesMultitaskable = () => {
    if (selectedServiceIds.length === 0) return false;
    if (selectedServiceIds.length === 1) return true;
    
    const servicesForStaff = getServicesForStaff();
    const selectedServices = servicesForStaff.filter(s => selectedServiceIds.includes(s.id));
    return selectedServices.every(s => s.is_multitaskable === 1);
  };

  // Get service price
  const getServicePrice = () => {
    const servicesForStaff = getServicesForStaff();
    const selectedServices = servicesForStaff.filter(s => selectedServiceIds.includes(s.id));
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  };

  // Get total duration of selected services
  const getTotalDuration = () => {
    const servicesForStaff = getServicesForStaff();
    const selectedServices = servicesForStaff.filter(s => selectedServiceIds.includes(s.id));
    return selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
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

  // Generate time slots based on open_time and close_time
  const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
    const slots: string[] = [];
    const startHour = parseInt(openTime.split(':')[0]);
    const startMinute = parseInt(openTime.split(':')[1]);
    const endHour = parseInt(closeTime.split(':')[0]);
    const endMinute = parseInt(closeTime.split(':')[1]);
    
    let currentHour = startHour;
    let currentMinute = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const hourStr = String(currentHour).padStart(2, '0');
      const minuteStr = String(currentMinute).padStart(2, '0');
      slots.push(`${hourStr}:${minuteStr}`);
      
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }
    
    return slots;
  };

  // Get appointments for a specific date and time range (considering duration)
  const getAppointmentsForTimeRange = (date: Date, time: string, durationMinutes: number): Appointment[] => {
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    
    // Filter appointments by date and time range
    return allAppointments.filter(app => {
      if (app.status === 'cancelled') return false;
      if (app.appointment_date !== dateStr) return false;
      
      // Parse appointment time
      const [appHours, appMinutes] = app.appointment_time.split(':').map(Number);
      const appStartMinutes = appHours * 60 + appMinutes;
      const appEndMinutes = appStartMinutes + app.duration_minutes;
      
      // Check if the time ranges overlap
      return (appStartMinutes < endMinutes && appEndMinutes > startMinutes);
    });
  };

  // Get appointment count for a specific time range
  const getAppointmentCountForTimeRange = (date: Date, time: string, durationMinutes: number): number => {
    return getAppointmentsForTimeRange(date, time, durationMinutes).length;
  };

  // Get appointments for a specific date and time (exact match - for display)
  const getAppointmentsForDateTime = (date: Date, time: string): Appointment[] => {
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const timeStr = time + ':00';
    
    return allAppointments.filter(app => {
      if (app.status === 'cancelled') return false;
      if (app.appointment_date !== dateStr) return false;
      const appTime = app.appointment_time;
      if (appTime === timeStr || appTime === time) return true;
      return false;
    });
  };

  // Get appointment count for a specific date and time (exact match)
  const getAppointmentCountForDateTime = (date: Date, time: string): number => {
    return getAppointmentsForDateTime(date, time).length;
  };

  // Check if a time slot is available for booking (considering duration)
  const isTimeSlotAvailable = (date: Date, time: string): boolean => {
    const totalDuration = getTotalDuration();
    const count = getAppointmentCountForTimeRange(date, time, totalDuration);
    return count < MAX_APPOINTMENTS_PER_TIME;
  };

  // Get time slot status for display
  const getTimeSlotStatus = (date: Date, time: string): 'available' | 'partial' | 'full' => {
    const totalDuration = getTotalDuration();
    const count = getAppointmentCountForTimeRange(date, time, totalDuration);
    
    if (count === 0) return 'available';
    if (count < MAX_APPOINTMENTS_PER_TIME) return 'partial';
    return 'full';
  };

  const getTimeSlotsForDate = (date: Date): string[] => {
    const scheduleStatus = getScheduleStatus(date);
    if (scheduleStatus.status !== 'open' || !scheduleStatus.schedule) {
      return [];
    }
    
    const { open_time, close_time } = scheduleStatus.schedule;
    return generateTimeSlots(open_time, close_time);
  };

  const handleStaffSelect = (staffId: number) => {
    setSelectedStaffId(staffId);
    setSelectedServiceIds([]);
    setBookingStep('services');
  };

  const handleServiceSelect = (serviceId: number) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(id => id !== serviceId));
      return;
    }
    
    if (selectedServiceIds.length >= 2) {
      Alert.alert("Maximum Services", "You can select up to 2 services only.");
      return;
    }
    
    const servicesForStaff = getServicesForStaff();
    const newService = servicesForStaff.find(s => s.id === serviceId);
    const existingServices = servicesForStaff.filter(s => selectedServiceIds.includes(s.id));
    
    if (selectedServiceIds.length === 1) {
      const existingService = existingServices[0];
      if (newService?.is_multitaskable !== 1 && existingService?.is_multitaskable !== 1) {
        Alert.alert("Not Multitaskable", "Both services must be multitaskable to select multiple services.");
        return;
      }
      if (newService?.is_multitaskable !== 1) {
        Alert.alert("Not Multitaskable", "This service cannot be combined with another service.");
        return;
      }
      if (existingService?.is_multitaskable !== 1) {
        Alert.alert("Not Multitaskable", "The selected service cannot be combined with another service.");
        return;
      }
    }
    
    setSelectedServiceIds([...selectedServiceIds, serviceId]);
  };

  const handleContinueToDateTime = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert("Selection Required", "Please select at least one service.");
      return;
    }
    setBookingStep('datetime');
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
    
    if (!isStaffAvailableOnDate(selectedStaffId!, date)) {
      Alert.alert("Staff Not Available", "The selected stylist is not available on this date. Please select another date.");
      return;
    }
    
    setSelectedDateForModal(date);
    setShowTimePickerModal(true);
  };

  const handleTimeSelect = (time: string) => {
    // Check if the time slot is available based on duration
    if (!isTimeSlotAvailable(selectedDateForModal!, time)) {
      const totalDuration = getTotalDuration();
      Alert.alert(
        "Time Slot Full", 
        `This time slot already has ${MAX_APPOINTMENTS_PER_TIME} appointment(s) within the ${totalDuration}-minute service duration. Please choose another time.`
      );
      return;
    }
    
    const [hours, minutes] = time.split(':');
    const newDateTime = new Date(selectedDateForModal!);
    newDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
    setSelectedDate(newDateTime);
    setSelectedTime(newDateTime);
    setShowTimePickerModal(false);
    setSelectedDateForModal(null);
    
    setBookingStep('paymentType');
  };

  const handleContinueToPaymentType = () => {
    if (!selectedDate) {
      Alert.alert("Selection Required", "Please select a date and time first.");
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
        service_id: selectedServiceIds[0] || 0,
        service_ids: selectedServiceIds,
        assigned_employee_id: selectedStaffId,
        service_status: 'pending',
        total_amount: getServicePrice(),
        total_duration: getTotalDuration(),
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
      const serviceNames = getServiceNames();

      const receipt: ReceiptData = {
        bookingId: result.appointment_id?.toString() || receiptNumber,
        serviceName: serviceNames,
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
    setBookingStep('stylist');
    setSelectedStaffId(null);
    setSelectedServiceIds([]);
    setSelectedPaymentType(null);
    setSelectedPaymentMethod(null);
    if (onBookingSuccess) {
      onBookingSuccess();
    }
  };

  const handleBackToStylist = () => {
    setBookingStep('stylist');
    setSelectedServiceIds([]);
  };

  const handleBackToServices = () => {
    setBookingStep('services');
  };

  const handleBackToDateTime = () => {
    setBookingStep('datetime');
  };

  const handleBackToPaymentType = () => {
    setBookingStep('paymentType');
  };

  // Helper functions
  const getStaffName = (staffId: number | null) => {
    if (!staffId) return '';
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : '';
  };

  const getStaffSpecialties = (staffId: number | null) => {
    if (!staffId) return 'No specialties assigned';
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember?.staff_specialties) return 'No specialties assigned';
    
    return staffMember.staff_specialties
      .filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name || '')
      .filter(Boolean)
      .join(', ');
  };

  const getServiceNames = () => {
    const servicesForStaff = getServicesForStaff();
    const selectedServices = servicesForStaff.filter(s => selectedServiceIds.includes(s.id));
    return selectedServices.map(s => s.service_name).join(' + ');
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}${day}-${random}`;
  };

  // Get staff rating with error handling
  const getStaffRating = (staffId: number) => {
    try {
      const staffReviews = staffFeedbacks.filter(f => f.staff_id === staffId);
      if (staffReviews.length === 0) return { average: 0, count: 0 };
      
      const total = staffReviews.reduce((sum, feedback) => {
        const rating = typeof feedback.rating === 'number' ? feedback.rating : parseFloat(feedback.rating as any) || 0;
        return sum + rating;
      }, 0);
      
      const average = parseFloat((total / staffReviews.length).toFixed(1));
      return { 
        average: average, 
        count: staffReviews.length 
      };
    } catch (error) {
      console.error(`Error getting rating for staff ${staffId}:`, error);
      return { average: 0, count: 0 };
    }
  };

  // Generate star rating display with error handling
  const renderStars = (rating: number) => {
    const validRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
    const fullStars = Math.floor(validRating);
    const hasHalfStar = validRating % 1 >= 0.5;
    const stars = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={14} color="#fbbf24" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half-star" name="star-half" size={14} color="#fbbf24" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-star-${i}`} name="star-outline" size={14} color="#d1d5db" />);
    }
    return stars;
  };

  // Time Picker Modal - Enhanced with duration awareness
  const TimePickerModal = () => {
    const availableTimeSlots = selectedDateForModal ? getTimeSlotsForDate(selectedDateForModal) : [];
    const totalDuration = getTotalDuration();
    
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
              <View>
                <Text className="text-lg font-semibold text-gray-800">
                  Select Time for {selectedDateForModal?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text className="text-xs text-gray-400">
                  Duration: {totalDuration} minutes • Max {MAX_APPOINTMENTS_PER_TIME} appointment(s) per slot
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowTimePickerModal(false);
                setSelectedDateForModal(null);
              }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row items-center justify-between mb-3 px-2">
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-green-500" />
                <Text className="text-xs text-gray-600">Available</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-yellow-500" />
                <Text className="text-xs text-gray-600">Partial ({MAX_APPOINTMENTS_PER_TIME - 1} left)</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-red-500" />
                <Text className="text-xs text-gray-600">Full</Text>
              </View>
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
                  {availableTimeSlots.map((time) => {
                    const status = getTimeSlotStatus(selectedDateForModal!, time);
                    const appointmentCount = getAppointmentCountForTimeRange(selectedDateForModal!, time, totalDuration);
                    const isAvailable = status !== 'full';
                    const isSelected = selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) === time;
                    
                    let statusColor = 'bg-gray-100';
                    let statusTextColor = 'text-gray-700';
                    let borderColor = 'border-gray-200';
                    
                    if (isSelected) {
                      statusColor = 'bg-pink-500';
                      statusTextColor = 'text-white';
                      borderColor = 'border-pink-500';
                    } else if (status === 'available') {
                      statusColor = 'bg-green-50';
                      statusTextColor = 'text-green-700';
                      borderColor = 'border-green-200';
                    } else if (status === 'partial') {
                      statusColor = 'bg-yellow-50';
                      statusTextColor = 'text-yellow-700';
                      borderColor = 'border-yellow-200';
                    } else {
                      statusColor = 'bg-red-50';
                      statusTextColor = 'text-red-500';
                      borderColor = 'border-red-200';
                    }
                    
                    return (
                      <TouchableOpacity
                        key={time}
                        className={`w-[30%] py-3 mb-3 rounded-xl border-2 ${borderColor} items-center ${isSelected ? 'shadow-lg' : ''}`}
                        style={{
                          backgroundColor: isSelected ? '#ec4899' : (statusColor === 'bg-pink-500' ? '#ec4899' : undefined),
                          opacity: isAvailable ? 1 : 0.6
                        }}
                        onPress={() => isAvailable && handleTimeSelect(time)}
                        disabled={!isAvailable}
                      >
                        <Text className={isSelected ? 'text-white font-bold' : statusTextColor}>
                          {time}
                        </Text>
                        {!isSelected && (
                          <View className="flex-row items-center mt-1">
                            {status === 'available' ? (
                              <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                            ) : status === 'partial' ? (
                              <View className="flex-row items-center">
                                <Ionicons name="time-outline" size={10} color="#eab308" />
                                <Text className="text-[8px] text-yellow-600 ml-0.5">
                                  {MAX_APPOINTMENTS_PER_TIME - appointmentCount} left
                                </Text>
                              </View>
                            ) : (
                              <Ionicons name="close-circle" size={12} color="#ef4444" />
                            )}
                            {appointmentCount > 0 && (
                              <Text className="text-[8px] ml-1 text-gray-400">
                                ({appointmentCount}/{MAX_APPOINTMENTS_PER_TIME})
                              </Text>
                            )}
                          </View>
                        )}
                        {isSelected && (
                          <View className="mt-1">
                            <Text className="text-[8px] text-white/80">
                              {appointmentCount}/{MAX_APPOINTMENTS_PER_TIME} booked • {totalDuration}min
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
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
                      <Text className="text-gray-600 text-sm">Service(s)</Text>
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
    const totalDuration = getTotalDuration();
    const downpaymentAmount = totalPrice / 2;
    const fullPaymentAmount = totalPrice;
    const servicesForStaff = getServicesForStaff();
    const selectedStaff = selectedStaffId ? staff.find(s => s.id === selectedStaffId) : null;
    
    return (
      <View className="flex-1">
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          className="flex-1"
        >
          <View className="px-5 pt-6">
            {/* Back Button */}
            {(bookingStep === 'services' || bookingStep === 'datetime' || bookingStep === 'paymentType' || bookingStep === 'paymentMethod') && (
              <TouchableOpacity 
                className="flex-row items-center mb-4"
                onPress={
                  bookingStep === 'paymentMethod' ? handleBackToPaymentType :
                  bookingStep === 'paymentType' ? handleBackToDateTime :
                  bookingStep === 'datetime' ? handleBackToServices :
                  handleBackToStylist
                }
                disabled={isProcessing}
              >
                <Ionicons name="arrow-back" size={24} color="#ec4899" />
                <Text className="text-pink-500 font-semibold ml-2">
                  {bookingStep === 'paymentMethod' ? 'Back to Payment Type' : 
                   bookingStep === 'paymentType' ? 'Back to Date & Time' :
                   bookingStep === 'datetime' ? 'Back to Services' :
                   'Back to Stylists'}
                </Text>
              </TouchableOpacity>
            )}
            
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              {bookingStep === 'stylist' ? 'Select Stylist' : 
               bookingStep === 'services' ? 'Select Services' :
               bookingStep === 'datetime' ? 'Select Date & Time' :
               bookingStep === 'paymentType' ? 'Select Payment Type' : 'Select Payment Method'}
            </Text>
            <Text className="text-gray-500 mb-6">
              {bookingStep === 'stylist' ? 'Choose your preferred stylist' : 
               bookingStep === 'services' ? `Selected: ${selectedStaff?.first_name} ${selectedStaff?.last_name}` :
               bookingStep === 'datetime' ? `Selected: ${selectedStaff?.first_name} ${selectedStaff?.last_name} - ${getServiceNames()}` :
               bookingStep === 'paymentType' ? `Selected Date: ${selectedDate.toLocaleDateString()} at ${selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` :
               `Complete your booking`}
            </Text>
            
            {/* Step 1: Stylist Selection - Card Style */}
            {bookingStep === 'stylist' && (
              <>
                {isLoading ? (
                  <View className="py-10 items-center">
                    <ActivityIndicator size="large" color="#ec4899" />
                    <Text className="text-center text-gray-500 mt-2">Loading stylists...</Text>
                  </View>
                ) : staff.length === 0 ? (
                  <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                    <Ionicons name="people-outline" size={50} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">No stylists available</Text>
                  </View>
                ) : (
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    className="mb-4"
                  >
                    <View className="flex-row flex-wrap justify-between">
                      {staff.map((staffMember) => {
                        const ratingData = getStaffRating(staffMember.id);
                        const { average, count } = ratingData;
                        const specialties = getStaffSpecialties(staffMember.id);
                        const profileImage = (staffMember as any).profile_image;
                        
                        return (
                          <TouchableOpacity 
                            key={staffMember.id} 
                            className="w-[48%] mb-4"
                            onPress={() => handleStaffSelect(staffMember.id)}
                            activeOpacity={0.85}
                            disabled={isProcessing}
                          >
                            <View className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ elevation: 4 }}>
                              {/* Profile Image - Main Highlight */}
                              <View className="relative">
                                {profileImage ? (
                                  <Image 
                                    source={{ uri: profileImage }} 
                                    className="w-full h-48"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="w-full h-48 bg-gradient-to-br from-pink-400 to-pink-600 items-center justify-center">
                                    <Text className="text-white font-bold text-5xl">
                                      {staffMember.first_name?.charAt(0)}{staffMember.last_name?.charAt(0)}
                                    </Text>
                                  </View>
                                )}
                                
                                {/* Rating Badge */}
                                {average > 0 && (
                                  <View className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 flex-row items-center">
                                    <Ionicons name="star" size={14} color="#fbbf24" />
                                    <Text className="text-white font-bold text-xs ml-1">
                                      {typeof average === 'number' && !isNaN(average) ? average.toFixed(1) : '0.0'}
                                    </Text>
                                    <Text className="text-white/70 text-xs ml-1">
                                      ({count})
                                    </Text>
                                  </View>
                                )}
                                
                                {/* Status Badge */}
                                <View className="absolute bottom-3 left-3 bg-green-500 rounded-full px-3 py-1">
                                  <Text className="text-white text-xs font-semibold">Available</Text>
                                </View>
                              </View>
                              
                              {/* Staff Info */}
                              <View className="p-3">
                                <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                                  {staffMember.first_name} {staffMember.last_name}
                                </Text>
                                
                                {/* Specialties */}
                                <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
                                  {specialties}
                                </Text>
                                
                                {/* Star Rating Row */}
                                <View className="flex-row items-center mt-2">
                                  <View className="flex-row">
                                    {average > 0 ? (
                                      renderStars(average)
                                    ) : (
                                      <Text className="text-gray-400 text-xs">No ratings yet</Text>
                                    )}
                                  </View>
                                </View>
                                
                                {/* Book Button */}
                                <View className="mt-3 pt-3 border-t border-gray-100">
                                  <View className="bg-pink-500 rounded-full py-2 items-center">
                                    <Text className="text-white font-semibold text-sm">Select Stylist</Text>
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
              </>
            )}
            
            {/* Step 2: Service Selection */}
            {bookingStep === 'services' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Selected Stylist</Text>
                  <Text className="text-lg font-bold text-gray-800">
                    {selectedStaff?.first_name} {selectedStaff?.last_name}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {getStaffSpecialties(selectedStaffId)}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className="flex-row">
                      {(() => {
                        const { average, count } = getStaffRating(selectedStaffId!);
                        return average > 0 ? (
                          <>
                            {renderStars(average)}
                            <Text className="text-gray-500 text-xs ml-1">
                              ({average.toFixed(1)} · {count} {count === 1 ? 'review' : 'reviews'})
                            </Text>
                          </>
                        ) : (
                          <Text className="text-gray-400 text-xs">No ratings yet</Text>
                        );
                      })()}
                    </View>
                  </View>
                </View>

                <Text className="text-lg font-semibold text-gray-800 mb-2">Select Services</Text>
                <Text className="text-gray-500 text-sm mb-4">
                  Select up to 2 services (must be multitaskable)
                </Text>
                
                {servicesForStaff.length === 0 ? (
                  <View className="py-8 items-center">
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">
                      No services available for this stylist's specialty
                    </Text>
                  </View>
                ) : (
                  servicesForStaff.map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    const isMultitaskable = service.is_multitaskable === 1;
                    
                    return (
                      <TouchableOpacity 
                        key={service.id} 
                        className={`rounded-2xl p-4 mb-3 border-2 ${
                          isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                        }`}
                        onPress={() => handleServiceSelect(service.id)}
                        activeOpacity={0.7}
                        disabled={isProcessing}
                      >
                        <View className="flex-row items-start">
                          <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${
                            isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
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
                              {isMultitaskable && (
                                <View className="ml-3 bg-green-100 px-2 py-0.5 rounded-full">
                                  <Text className="text-green-600 text-xs">Multitaskable</Text>
                                </View>
                              )}
                              {!isMultitaskable && (
                                <View className="ml-3 bg-red-100 px-2 py-0.5 rounded-full">
                                  <Text className="text-red-600 text-xs">Single Only</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Text className="text-pink-500 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
                
                {selectedServiceIds.length > 0 && (
                  <View className="mt-4 p-3 bg-gray-50 rounded-xl">
                    <Text className="text-gray-600 text-sm">Selected: {getServiceNames()}</Text>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-600 text-sm">Total Duration: {totalDuration} mins</Text>
                      <Text className="text-pink-500 font-bold text-lg">₱{totalPrice.toLocaleString()}</Text>
                    </View>
                    {selectedServiceIds.length === 2 && !areServicesMultitaskable() && (
                      <Text className="text-red-500 text-xs mt-1">
                        ⚠️ Warning: Selected services may not be multitaskable
                      </Text>
                    )}
                    {selectedServiceIds.length === 2 && areServicesMultitaskable() && (
                      <Text className="text-green-500 text-xs mt-1">
                        ✅ Both services are multitaskable
                      </Text>
                    )}
                  </View>
                )}
                
                <TouchableOpacity 
                  className="bg-pink-500 py-4 rounded-xl mt-6"
                  onPress={handleContinueToDateTime}
                  disabled={selectedServiceIds.length === 0 || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Date & Time
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Step 3: Calendar + Time Selection */}
            {bookingStep === 'datetime' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Booking Summary</Text>
                  <Text className="text-lg font-bold text-gray-800">{getServiceNames()}</Text>
                  <Text className="text-gray-500 text-sm mt-1">Stylist: {getStaffName(selectedStaffId)}</Text>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-gray-500 text-sm">{selectedServiceIds.length} service(s) • {totalDuration} mins</Text>
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
                    const isStaffAvailable = selectedStaffId ? isStaffAvailableOnDate(selectedStaffId, date) : false;
                    const isBookable = isDateBookable(date) && isStaffAvailable;
                    
                    let cellBgColor = 'bg-gray-50';
                    let indicatorColor = null;
                    
                    if (!isPast) {
                      if (isBookable) {
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
                            isBookable ? 'text-green-700' :
                            scheduleStatus.status === 'closed' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {dayNumber}
                          </Text>
                          {indicatorColor && !isSelected && (
                            <View className={`w-1.5 h-1.5 rounded-full ${indicatorColor} mt-0.5`} />
                          )}
                          {!isPast && !isBookable && isStaffAvailable && (
                            <View className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-0.5" />
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
                        <Text className="text-gray-400 text-xs ml-2">
                          ({totalDuration} min duration)
                        </Text>
                      </View>
                    )}
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
                  onPress={handleContinueToPaymentType}
                  disabled={!selectedDate || isProcessing}
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
                  <Text className="text-lg font-bold text-gray-800">{getServiceNames()}</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Time: {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Duration: {totalDuration} mins</Text>
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
                  <Text className="text-lg font-bold text-gray-800">{getServiceNames()}</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Time: {selectedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">Duration: {totalDuration} mins</Text>
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

        <TimePickerModal />
        <ReceiptModal />
      </View>
    );
  };

  return renderContent();
}