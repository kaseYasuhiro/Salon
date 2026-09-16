import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Transaction {
  id: number;
  appointment_id: number;
  customer_id: number;
  service_id: number;
  assigned_employee_id?: number;
  total_amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  appointment?: {
    id: number;
    appointment_date: string;
    appointment_time: string;
    status: string;
    service_status: string;
    service_name: string;
    duration_minutes: number;
    price: string;
    assigned_employee_id?: number;
  };
  service?: {
    id: number;
    service_name: string;
    description: string;
    price: number;
    duration_minutes: number;
  };
  assigned_employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
}

interface Appointment {
  id: number;
  customer_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_status: string;
  services: Array<{
    service_name: string;
    duration_minutes: number;
    price: string;
    service_status: string;
  }>;
  service_names: string[];
  total_price: number;
  total_duration: number;
  assigned_employee_id?: number;
  stylist_name?: string;
  stylist_id?: number;
  // Billing fields from the API
  billing_total_amount?: number | null;
  billing_paid_amount?: number | null;
  billing_balance?: number | null;
  // Backward compatibility
  service_name?: string;
  duration_minutes?: number;
  price?: string;
}

interface Feedback {
  id: number;
  customer_id: number;
  appointment_id: number;
  rating: number;
  comments: string;
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  service_name?: string;
}

interface StaffFeedback {
  id: number;
  staff_id: number;
  rating: number;
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

interface CustomerHistoryProps {
  onOpenFeedbackPage?: (appointment: any) => void;
  refreshTrigger?: number;
}

// ─────────────────────────────────────────────────────────────
// Feedback Page
// ─────────────────────────────────────────────────────────────
const FeedbackPage = ({ 
  appointment, 
  onBack, 
  onSubmit 
}: { 
  appointment: any; 
  onBack: () => void; 
  onSubmit: (serviceRating: number, staffRating: number, comment: string) => Promise<void>;
}) => {
  const [serviceRating, setServiceRating] = useState<number>(0);
  const [staffRating, setStaffRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (serviceRating === 0) {
      Alert.alert("Rating Required", "Please rate the service before submitting.");
      return;
    }

    if (staffRating === 0) {
      Alert.alert("Rating Required", "Please rate the stylist before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(serviceRating, staffRating, feedbackComment);
      onBack();
    } catch (error) {
      // Error is already handled in the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* ✅ Solid pink header (gradient doesn't render on native) */}
      <View
        className="px-5 pt-12 pb-4"
        style={{ backgroundColor: '#ec4899' }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="p-1">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Leave Feedback</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView className="flex-1 p-5">
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <Text className="text-gray-800 text-lg font-bold text-center mb-2">
            {appointment.service_names?.join(' + ') || appointment.service_name || 'Appointment'}
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            {formatDate(appointment.appointment_date)} at {appointment.appointment_time}
          </Text>
          {appointment.stylist_name && appointment.stylist_name !== 'Not assigned' && (
            <Text className="text-gray-500 text-sm text-center mt-1">
              Stylist: <Text className="font-semibold">{appointment.stylist_name}</Text>
            </Text>
          )}
          {appointment.services && appointment.services.length > 1 && (
            <View className="mt-2 pt-2 border-t border-gray-100">
              <Text className="text-gray-400 text-xs text-center">
                {appointment.services.length} services included
              </Text>
            </View>
          )}
        </View>

        {/* Service Rating */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <Text className="text-gray-800 text-lg font-semibold text-center mb-2">
            Rate the Service
          </Text>
          <Text className="text-gray-500 text-sm text-center mb-4">
            How was the overall service quality?
          </Text>

          <View className="flex-row justify-center gap-3 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={`service-${star}`}
                onPress={() => setServiceRating(star)}
                className="p-1"
              >
                <Ionicons 
                  name={star <= serviceRating ? "star" : "star-outline"} 
                  size={40} 
                  color={star <= serviceRating ? "#fbbf24" : "#d1d5db"} 
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-center text-gray-400 text-xs">
            {serviceRating > 0 ? `${serviceRating} / 5` : 'Tap a star to rate'}
          </Text>
        </View>

        {/* Staff Rating */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <Text className="text-gray-800 text-lg font-semibold text-center mb-2">
            Rate the Stylist
          </Text>
          <Text className="text-gray-500 text-sm text-center mb-4">
            How was your experience with {appointment.stylist_name || 'the stylist'}?
          </Text>

          <View className="flex-row justify-center gap-3 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={`staff-${star}`}
                onPress={() => setStaffRating(star)}
                className="p-1"
              >
                <Ionicons 
                  name={star <= staffRating ? "star" : "star-outline"} 
                  size={40} 
                  color={star <= staffRating ? "#fbbf24" : "#d1d5db"} 
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-center text-gray-400 text-xs">
            {staffRating > 0 ? `${staffRating} / 5` : 'Tap a star to rate'}
          </Text>
        </View>

        {/* Comment */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <View className="border-t border-gray-100 pt-4">
            <Text className="text-gray-700 text-sm font-semibold mb-3">
              Share your thoughts (Optional)
            </Text>
            <TextInput
              multiline
              numberOfLines={5}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="Tell us about your experience with the service and stylist..."
              className="border border-gray-200 rounded-xl p-4 text-gray-700 min-h-[120px] text-base"
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* ✅ Buttons with solid backgrounds (no gradient on native) */}
        <View className="flex-row gap-3 mb-5">
          <TouchableOpacity
            onPress={onBack}
            className="flex-1 py-3 rounded-xl border border-gray-300 bg-white"
          >
            <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl"
            style={{ backgroundColor: isSubmitting ? '#f9a8d4' : '#ec4899' }}
          >
            <Text className="text-white text-center font-semibold">
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Main History Tab
// ─────────────────────────────────────────────────────────────
export default function CustomerHistoryTab({ onOpenFeedbackPage, refreshTrigger }: CustomerHistoryProps) {
  const [showFeedbackPage, setShowFeedbackPage] = useState(false);
  const [selectedAppointmentForFeedback, setSelectedAppointmentForFeedback] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState<StaffFeedback[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  // ── Fetch user appointments ──
  const fetchUserAppointments = async () => {
    try {
      const response = await api.get("/appointments");
      console.log("Raw appointments response:", response.data);

      let transactionsData: any[] = [];
      if (Array.isArray(response.data)) {
        transactionsData = response.data;
      }

      const appointmentMap = new Map<number, {
        id: number;
        customer_id: number;
        appointment_date: string;
        appointment_time: string;
        status: string;
        services: Array<{
          service_name: string;
          duration_minutes: number;
          price: string;
          service_status: string;
        }>;
        assigned_employee_id?: number;
        stylist_name?: string;
        // ✅ Billing fields
        billing_total_amount?: number | null;
        billing_paid_amount?: number | null;
        billing_balance?: number | null;
      }>();

      transactionsData.forEach((item: any) => {
        const appointmentId = item.id;

        if (!appointmentMap.has(appointmentId)) {
          appointmentMap.set(appointmentId, {
            id: appointmentId,
            customer_id: item.customer_id,
            appointment_date: item.appointment_date,
            appointment_time: item.appointment_time,
            status: item.status,
            services: [],
            assigned_employee_id: item.assigned_employee_id,
            stylist_name: item.stylist_name,
            // ✅ Carry billing fields through
            billing_total_amount: item.billing_total_amount ?? null,
            billing_paid_amount: item.billing_paid_amount ?? null,
            billing_balance: item.billing_balance ?? null,
          });
        }

        const appointment = appointmentMap.get(appointmentId)!;
        appointment.services.push({
          service_name: item.service_name || 'Unknown Service',
          duration_minutes: item.duration_minutes || 0,
          price: item.price || '0',
          service_status: item.service_status || 'pending'
        });
      });

      const groupedAppointments: Appointment[] = Array.from(appointmentMap.values()).map((appointment) => {
        const serviceNames = appointment.services.map(s => s.service_name);
        const totalDuration = appointment.services.reduce((sum, s) => sum + s.duration_minutes, 0);
        const basePriceSum = appointment.services.reduce((sum, s) => sum + parseFloat(s.price || '0'), 0);

        // ✅ Prefer the grand total (base + adjustments) from billing
        const totalPrice = (appointment.billing_total_amount != null && appointment.billing_total_amount > 0)
          ? appointment.billing_total_amount
          : basePriceSum;

        const overallStatus = appointment.services.some(s => s.service_status === 'pending') 
          ? 'pending' 
          : appointment.services.every(s => s.service_status === 'completed') 
            ? 'completed' 
            : 'in_progress';

        let stylistName = appointment.stylist_name;
        if (!stylistName && appointment.assigned_employee_id) {
          const staffMember = staff.find(s => s.id === appointment.assigned_employee_id);
          if (staffMember) {
            stylistName = `${staffMember.first_name} ${staffMember.last_name}`;
          }
        }

        return {
          id: appointment.id,
          customer_id: appointment.customer_id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          status: appointment.status,
          services: appointment.services,
          service_names: serviceNames,
          total_price: totalPrice,
          total_duration: totalDuration,
          assigned_employee_id: appointment.assigned_employee_id,
          stylist_name: stylistName || 'Not assigned',
          stylist_id: appointment.assigned_employee_id,
          // ✅ Billing fields passed through
          billing_total_amount: appointment.billing_total_amount ?? totalPrice,
          billing_paid_amount: appointment.billing_paid_amount ?? 0,
          billing_balance: appointment.billing_balance ?? (totalPrice / 2),
          // Backward compatibility
          service_name: serviceNames.join(' + '),
          duration_minutes: totalDuration,
          price: totalPrice.toString(),
          service_status: overallStatus
        };
      });

      setAppointments(groupedAppointments);
      return groupedAppointments;
    } catch (error) {
      console.log("Error fetching appointments:", error);
      return [];
    }
  };

  const fetchUserTransactions = async () => {
    try {
      const response = await api.get("/transactions");
      let transactionsData: Transaction[] = [];
      if (Array.isArray(response.data)) {
        transactionsData = response.data.map((item: any) => ({
          id: item.id,
          appointment_id: item.appointment_id,
          customer_id: item.customer_id,
          service_id: item.service_id,
          assigned_employee_id: item.assigned_employee_id,
          total_amount: parseFloat(item.total_amount) || 0,
          payment_type: item.payment_type,
          payment_method: item.payment_method,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          appointment: item.appointment,
          service: item.service,
          assigned_employee: item.assigned_employee
        }));
      }
      setTransactions(transactionsData);
      return transactionsData;
    } catch (error) {
      console.log("Error fetching transactions:", error);
      return [];
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const response = await api.get("/feedbacks");
      let feedbacksData: Feedback[] = [];
      if (Array.isArray(response.data)) {
        feedbacksData = response.data;
      }
      setFeedbacks(feedbacksData);
      return feedbacksData;
    } catch (error) {
      console.log("Error fetching feedbacks:", error);
      return [];
    }
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
    } catch (error) {
      console.log("Error fetching staff feedbacks:", error);
      return [];
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
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

  const submitFeedback = async (data: { appointment_id: number; customer_id: number; rating: number; comments: string }) => {
    try {
      const response = await api.post("/feedbacks/submit", {
        appointment_id: data.appointment_id,
        customer_id: data.customer_id,
        rating: data.rating,
        comments: data.comments
      });
      return response.data;
    } catch (error) {
      console.log("Error submitting feedback:", error);
      throw error;
    }
  };

  const submitStaffFeedback = async (data: { staff_id: number; customer_id: number; rating: number; comments: string }) => {
    try {
      const response = await api.post("/feedbacks/staff/submit", {
        staff_id: data.staff_id,
        customer_id: data.customer_id,
        rating: data.rating,
        comments: data.comments
      });
      return response.data;
    } catch (error) {
      console.log("Error submitting staff feedback:", error);
      throw error;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const hasFeedback = (appointmentId: number) => {
    return feedbacks.filter(f => f.appointment_id === appointmentId).length > 0;
  };

  const getFeedbackRating = (appointmentId: number) => {
    const feedbacksForAppointment = feedbacks.filter(f => f.appointment_id === appointmentId);
    if (feedbacksForAppointment.length > 0) {
      return feedbacksForAppointment[0].rating;
    }
    return null;
  };

  const getStaffName = (staffId: number) => {
    if (!staffId) return null;
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : null;
  };

  const getStylistNameForAppointment = (appointment: Appointment) => {
    if (appointment.stylist_name && appointment.stylist_name !== 'Not assigned') {
      return appointment.stylist_name;
    }
    if (appointment.assigned_employee_id) {
      const name = getStaffName(appointment.assigned_employee_id);
      if (name) return name;
    }
    if (transactions.length > 0) {
      const transaction = transactions.find(t => t.appointment_id === appointment.id);
      if (transaction?.assigned_employee) {
        return `${transaction.assigned_employee.first_name} ${transaction.assigned_employee.last_name}`;
      }
      if (transaction?.assigned_employee_id) {
        const name = getStaffName(transaction.assigned_employee_id);
        if (name) return name;
      }
    }
    return 'Not assigned';
  };

  const getStylistIdForAppointment = (appointmentId: number) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment && appointment.assigned_employee_id) {
      return appointment.assigned_employee_id;
    }
    const transaction = transactions.find(t => t.appointment_id === appointmentId);
    if (transaction?.assigned_employee_id) {
      return transaction.assigned_employee_id;
    }
    return null;
  };

  const handleOpenFeedbackPage = (appointment: Appointment) => {
    const stylistName = getStylistNameForAppointment(appointment);
    const stylistId = getStylistIdForAppointment(appointment.id);

    const enrichedAppointment = {
      ...appointment,
      stylist_name: stylistName,
      stylist_id: stylistId,
      assigned_employee_id: stylistId
    };

    if (onOpenFeedbackPage) {
      onOpenFeedbackPage(enrichedAppointment);
    } else {
      setSelectedAppointmentForFeedback(enrichedAppointment);
      setShowFeedbackPage(true);
    }
  };

  const handleCloseFeedbackPage = () => {
    setShowFeedbackPage(false);
    setSelectedAppointmentForFeedback(null);
  };

  const handleSubmitFeedback = async (serviceRating: number, staffRating: number, comment: string) => {
    const customerId = user?.id;

    if (!customerId || customerId === 0) {
      Alert.alert("Error", "Please log in again to submit feedback.");
      throw new Error("No customer ID");
    }

    await submitFeedback({
      appointment_id: selectedAppointmentForFeedback.id,
      customer_id: customerId,
      rating: serviceRating,
      comments: comment
    });

    if (selectedAppointmentForFeedback.stylist_id || selectedAppointmentForFeedback.assigned_employee_id) {
      const staffId = selectedAppointmentForFeedback.stylist_id || selectedAppointmentForFeedback.assigned_employee_id;
      await submitStaffFeedback({
        staff_id: staffId,
        customer_id: customerId,
        rating: staffRating,
        comments: comment
      });
    } else {
      Alert.alert("Warning", "No stylist was assigned to this appointment. Staff feedback was not submitted.");
    }

    Alert.alert("Thank You!", "Your feedback has been submitted successfully.");
    await Promise.all([
      fetchUserAppointments(),
      fetchUserTransactions(),
      fetchFeedbacks(),
      fetchStaffFeedbacks()
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserAppointments(),
      fetchUserTransactions(),
      fetchFeedbacks(),
      fetchStaffFeedbacks(),
      fetchStaff()
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchUserAppointments(),
      fetchUserTransactions(),
      fetchFeedbacks(),
      fetchStaffFeedbacks(),
      fetchStaff()
    ]).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      Promise.all([
        fetchUserAppointments(),
        fetchUserTransactions(),
        fetchFeedbacks(),
        fetchStaffFeedbacks(),
        fetchStaff()
      ]);
    }
  }, [refreshTrigger]);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i < rating ? "star" : "star-outline"} 
          size={14} 
          color={i < rating ? "#fbbf24" : "#d1d5db"} 
        />
      );
    }
    return stars;
  };

  const filteredAppointments = appointments.filter(
    (item) => item.status === 'completed' || item.status === 'cancelled'
  );

  if (showFeedbackPage && selectedAppointmentForFeedback) {
    return (
      <FeedbackPage 
        appointment={selectedAppointmentForFeedback}
        onBack={handleCloseFeedbackPage}
        onSubmit={handleSubmitFeedback}
      />
    );
  }

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
      }
    >
      <View className="px-5 pt-6">
        <Text className="text-3xl font-bold text-gray-800 mb-2">History</Text>
        <Text className="text-gray-500 mb-6">Your completed and cancelled appointments</Text>

        {isLoading ? (
          <View className="py-10">
            <Text className="text-center text-gray-500">Loading history...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
            <Ionicons name="document-text-outline" size={50} color="#d1d5db" />
            <Text className="text-gray-500 text-center mt-3">No completed or cancelled appointments</Text>
          </View>
        ) : (
          filteredAppointments.map((item) => {
            const hasGivenFeedback = hasFeedback(item.id);
            const existingRating = getFeedbackRating(item.id);
            const isCompleted = item.status === 'completed';
            const isMultipleServices = item.services && item.services.length > 1;
            const services = item.services || [];
            const serviceNames = item.service_names || ['No Service'];

            const stylistName = getStylistNameForAppointment(item);
            const stylistId = getStylistIdForAppointment(item.id);

            // ✅ Grand total (base + adjustments) — this is what we now display
            const grandTotal = item.billing_total_amount ?? item.total_price ?? 0;
            const paidAmount = item.billing_paid_amount ?? 0;
            const balance = item.billing_balance ?? (grandTotal - paidAmount);

            return (
              <View key={item.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center">
                      <Text className="font-semibold text-gray-800 text-lg">
                        {serviceNames.join(' + ')}
                      </Text>
                      {isMultipleServices && (
                        <View className="ml-2 bg-pink-100 px-2 py-0.5 rounded-full">
                          <Text className="text-pink-600 text-xs font-semibold">
                            {services.length} services
                          </Text>
                        </View>
                      )}
                    </View>

                    {isMultipleServices && services.length > 0 && (
                      <View className="mt-1">
                        {services.map((service, index) => (
                          <View key={index} className="flex-row items-center mt-0.5">
                            <View className="w-1.5 h-1.5 bg-pink-400 rounded-full mr-2" />
                            <Text className="text-gray-500 text-xs">
                              {service.service_name} ({service.duration_minutes} mins)
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View className="flex-row items-center mt-1">
                      <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">{formatDate(item.appointment_date)}</Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">{item.appointment_time}</Text>
                    </View>

                    <View className="flex-row items-center mt-1">
                      <Ionicons name="person-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">
                        Stylist: <Text className="font-medium text-gray-600">{stylistName}</Text>
                      </Text>
                    </View>

                    {isMultipleServices && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="hourglass-outline" size={12} color="#9ca3af" />
                        <Text className="text-gray-400 text-xs ml-1">Total: {item.total_duration} mins</Text>
                      </View>
                    )}

                    {/* ✅ Show grand total (base + adjustments) */}
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="cash-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">
                        Total: ₱{grandTotal.toLocaleString()}
                      </Text>
                    </View>

                    {balance > 0 && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="alert-circle-outline" size={12} color="#f59e0b" />
                        <Text className="text-orange-500 text-xs ml-1">
                          Balance: ₱{balance.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ✅ Right-side amount uses the grand total, not per-service base price */}
                  <Text className="text-pink-500 font-semibold">
                    ₱{grandTotal.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <View className={`px-2 py-0.5 rounded-full self-start ${getStatusColor(item.status)}`}>
                    <Text className="text-xs font-semibold capitalize">{item.status}</Text>
                  </View>

                  {/* Rate — no stylist assigned */}
                  {isCompleted && !hasGivenFeedback && (!stylistId || stylistName === 'Not assigned') && (
                    <TouchableOpacity 
                      onPress={() => {
                        Alert.alert(
                          "No Stylist Assigned",
                          "This appointment has no stylist assigned. You can still rate the service, but stylist rating will be skipped.",
                          [
                            { text: "Cancel", style: "cancel" },
                            { 
                              text: "Continue", 
                              onPress: () => {
                                const appointmentWithoutStylist = {
                                  ...item,
                                  stylist_name: 'Not assigned',
                                  stylist_id: null,
                                  assigned_employee_id: null
                                };
                                setSelectedAppointmentForFeedback(appointmentWithoutStylist);
                                setShowFeedbackPage(true);
                              }
                            }
                          ]
                        );
                      }}
                      className="flex-row items-center gap-1 px-3 py-1.5 bg-yellow-50 rounded-full"
                    >
                      <Ionicons name="star-outline" size={14} color="#eab308" />
                      <Text className="text-xs font-semibold text-yellow-600">Rate Service</Text>
                    </TouchableOpacity>
                  )}

                  {/* Rate — stylist assigned */}
                  {isCompleted && !hasGivenFeedback && stylistId && stylistName !== 'Not assigned' && (
                    <TouchableOpacity 
                      onPress={() => handleOpenFeedbackPage(item)}
                      className="flex-row items-center gap-1 px-3 py-1.5 bg-yellow-50 rounded-full"
                    >
                      <Ionicons name="star-outline" size={14} color="#eab308" />
                      <Text className="text-xs font-semibold text-yellow-600">Rate</Text>
                    </TouchableOpacity>
                  )}

                  {/* ✅ Already-rated badge — ONLY yellow stars, no green star */}
                  {isCompleted && hasGivenFeedback && (
                    <View className="flex-row items-center gap-1 px-3 py-1.5 bg-green-50 rounded-full">
                      <View className="flex-row items-center gap-0.5">
                        {renderStars(existingRating || 0)}
                      </View>
                      <Text className="text-xs font-semibold text-green-600 ml-1">
                        {Math.round(Number(existingRating) || 0)}/5
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}