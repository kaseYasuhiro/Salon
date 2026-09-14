import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, Image, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import api from '@/api/axios';
import * as DocumentPicker from 'expo-document-picker';
import CustomerBooking from "./customerBookTab";
import CustomerHistoryTab from "./customerHistoryTab";
import CustomerSettingsTab from "./customerSettingsTab";

// Define types locally
interface Transaction {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name: string;
  duration_minutes: number;
  price: string;
  service_status: string;
}

interface Appointment {
  id: number;
  customer_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_names: string[];
  services: Array<{
    service_name: string;
    duration_minutes: number;
    price: string;
    service_status: string;
  }>;
  total_price: number;
  total_duration: number;
  service_name?: string;
  duration_minutes?: number;
  price?: string;
  service_status?: string;
  has_remaining_balance?: boolean;
}

interface Service {
  id: number;
  service_name: string;
  description: string;
  price: number;
  duration_minutes: number;
  service_status?: string;
  is_multitaskable: number;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────────────────────
// Formatting helpers (module-level so PaymentModal can use them)
// ─────────────────────────────────────────────────────────────
const formatDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (time: string) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const calculateRemainingBalance = (price: string | number) => {
  const totalPrice = typeof price === 'string' ? parseFloat(price) : price;
  return totalPrice / 2;
};

// ─────────────────────────────────────────────────────────────
// PaymentModal — defined OUTSIDE so it doesn't remount
// ─────────────────────────────────────────────────────────────
interface PaymentModalProps {
  visible: boolean;
  appointment: Appointment | null;
  paymentProof: any;
  isProcessingPayment: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onRemoveProof: () => void;
  onConfirm: () => void;
  qrCodeImage: any;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  appointment,
  paymentProof,
  isProcessingPayment,
  onClose,
  onPickImage,
  onRemoveProof,
  onConfirm,
  qrCodeImage,
}) => {
  if (!appointment) return null;

  const remainingBalance = calculateRemainingBalance(appointment.total_price);
  const serviceNames = appointment.service_names || ['No Service'];

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-2xl overflow-hidden w-full" style={{ minWidth: 320, maxHeight: '90%' }}>
          <View className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Pay Remaining Balance</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-6">
              {/* Booking Summary */}
              <View className="bg-pink-50 rounded-xl p-4 mb-4">
                <Text className="text-gray-500 text-sm">Appointment Summary</Text>
                <Text className="text-lg font-bold text-gray-800">
                  {serviceNames.join(' + ')}
                </Text>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-500 text-sm">Date</Text>
                  <Text className="text-gray-800 text-sm">{formatDate(appointment.appointment_date)}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Time</Text>
                  <Text className="text-gray-800 text-sm">{formatTime(appointment.appointment_time)}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Services</Text>
                  <Text className="text-gray-800 text-sm">{(appointment.services || []).length} service(s)</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Total Amount</Text>
                  <Text className="text-pink-500 font-bold">₱{(appointment.total_price || 0).toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mt-1 pt-1 border-t border-pink-200">
                  <Text className="text-gray-600 font-semibold">Remaining Balance (50%)</Text>
                  <Text className="text-orange-600 font-bold text-lg">₱{remainingBalance.toLocaleString()}</Text>
                </View>
              </View>

              {/* QR Code */}
              <View className="items-center mb-4">
                <Text className="text-gray-700 font-semibold text-base mb-2">Pay with GCash</Text>
                <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md">
                  <Image source={qrCodeImage} className="w-40 h-40" resizeMode="contain" />
                </View>
                <Text className="text-gray-500 text-sm mt-2 text-center">
                  Amount to pay: <Text className="font-bold text-orange-600">₱{remainingBalance.toLocaleString()}</Text>
                </Text>
              </View>

              {/* Instructions */}
              <View className="bg-blue-50 rounded-xl p-3 mb-4">
                <Text className="text-blue-800 font-semibold text-sm mb-1">📋 How to Pay:</Text>
                <View className="space-y-1">
                  <Text className="text-gray-600 text-xs">1. Open GCash app → Tap "Pay QR"</Text>
                  <Text className="text-gray-600 text-xs">2. Scan the QR code above</Text>
                  <Text className="text-gray-600 text-xs">3. Enter amount: <Text className="font-bold">₱{remainingBalance.toLocaleString()}</Text></Text>
                  <Text className="text-gray-600 text-xs">4. Complete payment & take a screenshot</Text>
                  <Text className="text-gray-600 text-xs">5. Upload the screenshot below</Text>
                </View>
              </View>

              {/* Payment Method */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold text-sm mb-2">Payment Method</Text>
                <TouchableOpacity
                  className="flex-row items-center justify-center p-4 rounded-xl border-2 border-pink-500 bg-pink-50"
                  disabled={true}
                >
                  <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="phone-portrait-outline" size={16} color="#3b82f6" />
                  </View>
                  <Text className="font-semibold text-pink-600">GCash</Text>
                  <View className="ml-auto w-5 h-5 rounded-full bg-pink-500 items-center justify-center">
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Upload Payment Proof */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold text-sm mb-2">Upload Payment Proof</Text>
                <Text className="text-gray-500 text-xs mb-2">
                  Take a screenshot of your GCash payment receipt and upload it here
                </Text>

                <TouchableOpacity
                  className="flex-row items-center justify-center p-4 border-2 border-dashed border-pink-300 rounded-xl bg-pink-50"
                  onPress={onPickImage}
                  disabled={isProcessingPayment}
                >
                  <Ionicons
                    name={paymentProof ? "checkmark-circle" : "cloud-upload-outline"}
                    size={24}
                    color={paymentProof ? "#10b981" : "#ec4899"}
                  />
                  <Text className={`ml-2 font-semibold ${paymentProof ? 'text-green-600' : 'text-pink-500'}`}>
                    {paymentProof ? 'Receipt Uploaded ✓' : 'Tap to Upload Receipt'}
                  </Text>
                </TouchableOpacity>

                {paymentProof && (
                  <View className="mt-2">
                    <Image
                      source={{ uri: paymentProof.uri }}
                      className="w-full h-48 rounded-xl"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      className="mt-1 self-end"
                      onPress={onRemoveProof}
                    >
                      <Text className="text-red-500 text-xs font-semibold">Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Info Box */}
              <View className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="information-circle-outline" size={16} color="#eab308" />
                  <Text className="text-yellow-700 text-xs flex-1">
                    Please upload a clear screenshot of your GCash payment receipt.
                    This will be reviewed by our staff to confirm your payment.
                  </Text>
                </View>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                className={`py-4 rounded-xl ${!paymentProof ? 'bg-gray-400' : 'bg-pink-500'}`}
                onPress={onConfirm}
                disabled={!paymentProof || isProcessingPayment}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                </Text>
              </TouchableOpacity>

              {!paymentProof && (
                <Text className="text-gray-400 text-xs text-center mt-2">
                  Please upload your payment receipt
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Main dashboard
// ─────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'history' | 'settings'>('home');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>('gcash');
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { user, logout } = useAuth();

  // ✅ Safe area insets — used so the pink header can extend under the status bar
  const insets = useSafeAreaInsets();

  const qrCodeImage = require('@/assets/images/qr_code.png');

  // ── Fetch user appointments ──
  const fetchUserAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/appointments");
      console.log("Raw appointments response:", response.data);

      let transactions: Transaction[] = [];
      if (Array.isArray(response.data)) {
        transactions = response.data.map((item: any) => ({
          id: item.id,
          appointment_id: item.id,
          service_id: item.service_id,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price,
          service_status: item.service_status,
        }));
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
        has_remaining_balance?: boolean;
      }>();

      transactions.forEach((transaction) => {
        const appointmentId = transaction.appointment_id;

        if (!appointmentMap.has(appointmentId)) {
          const originalData = response.data.find((item: any) => item.id === appointmentId);
          const hasRemainingBalance = originalData?.has_remaining_balance !== false;

          appointmentMap.set(appointmentId, {
            id: appointmentId,
            customer_id: user?.id || 0,
            appointment_date: originalData?.appointment_date || '',
            appointment_time: originalData?.appointment_time || '',
            status: originalData?.status || '',
            services: [],
            has_remaining_balance: hasRemainingBalance
          });
        }

        const appointment = appointmentMap.get(appointmentId)!;
        appointment.services.push({
          service_name: transaction.service_name || 'Unknown Service',
          duration_minutes: transaction.duration_minutes || 0,
          price: transaction.price || '0',
          service_status: transaction.service_status || 'pending'
        });
      });

      const groupedAppointments: Appointment[] = Array.from(appointmentMap.values()).map((appointment) => {
        const serviceNames = appointment.services.map(s => s.service_name);
        const totalPrice = appointment.services.reduce((sum, s) => sum + parseFloat(s.price || '0'), 0);
        const totalDuration = appointment.services.reduce((sum, s) => sum + s.duration_minutes, 0);

        const overallStatus = appointment.services.some(s => s.service_status === 'pending')
          ? 'pending'
          : appointment.services.every(s => s.service_status === 'completed')
            ? 'completed'
            : 'in_progress';

        return {
          id: appointment.id,
          customer_id: appointment.customer_id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          status: appointment.status,
          service_names: serviceNames,
          services: appointment.services,
          total_price: totalPrice,
          total_duration: totalDuration,
          service_name: serviceNames.join(' + '),
          duration_minutes: totalDuration,
          price: totalPrice.toString(),
          service_status: overallStatus,
          has_remaining_balance: appointment.has_remaining_balance !== false
        };
      });

      setAppointments(groupedAppointments);

      const upcoming = groupedAppointments.filter((item: Appointment) => {
        const status = item.status;
        return status === "pending" || status === "confirmed";
      });
      setUpcomingCount(upcoming.length);

      const total = groupedAppointments
        .filter((item: Appointment) => item.service_status === "completed")
        .reduce((sum: number, item: Appointment) => sum + item.total_price, 0);
      setTotalSpent(total);

      return groupedAppointments;
    } catch (error) {
      console.log("Error fetching appointments:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
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
    } catch (error) {
      console.log("Error fetching services:", error);
      return [];
    }
  };

  // ── Image picker ──
  const pickImageFromGallery = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let fileType = 'jpeg';
        if (asset.mimeType) {
          const mimeParts = asset.mimeType.split('/');
          if (mimeParts.length > 1) fileType = mimeParts[1];
        } else if (asset.uri) {
          const uriParts = asset.uri.split('.');
          fileType = uriParts[uriParts.length - 1].toLowerCase();
        }

        setPaymentProof({
          uri: asset.uri,
          name: asset.name || `payment_${Date.now()}.${fileType}`,
          type: asset.mimeType || `image/${fileType}`,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // ── Payment handlers ──
  const handlePayBalance = (appointment: Appointment) => {
    setSelectedAppointmentForPayment(appointment);
    setSelectedPaymentMethod('gcash');
    setPaymentProof(null);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAppointmentForPayment(null);
    setSelectedPaymentMethod('gcash');
    setPaymentProof(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedAppointmentForPayment) {
      Alert.alert("Error", "No appointment selected for payment.");
      return;
    }
    if (!paymentProof) {
      Alert.alert("Upload Required", "Please upload your payment receipt as proof of payment.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const remainingBalance = calculateRemainingBalance(selectedAppointmentForPayment.total_price);

      const formData = new FormData();
      formData.append('appointment_id', selectedAppointmentForPayment.id.toString());
      formData.append('total_amount', remainingBalance.toString());
      formData.append('payment_type', 'remaining');
      formData.append('payment_method', selectedPaymentMethod || 'gcash');

      if (paymentProof) {
        let fileType = 'jpeg';
        let mimeType = 'image/jpeg';
        if (paymentProof.type) {
          mimeType = paymentProof.type;
          const mimeParts = mimeType.split('/');
          if (mimeParts.length > 1) fileType = mimeParts[1];
        } else if (paymentProof.uri) {
          const uriParts = paymentProof.uri.split('.');
          fileType = uriParts[uriParts.length - 1].toLowerCase();
          mimeType = `image/${fileType}`;
        }
        const validTypes = ['jpeg', 'jpg', 'png', 'gif'];
        if (!validTypes.includes(fileType)) {
          fileType = 'jpeg';
          mimeType = 'image/jpeg';
        }
        formData.append('payment_proof', {
          uri: paymentProof.uri,
          name: paymentProof.name || `payment_${Date.now()}.${fileType}`,
          type: mimeType,
        } as any);
      }

      const response = await api.post('/payment/remaining', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Payment Successful", "Your remaining balance has been paid. Thank you!");
      handleClosePaymentModal();
      await fetchUserAppointments();
    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "Failed to process payment. Please try again."
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getUpcomingAppointments = () => {
    return appointments.filter((item: Appointment) => {
      const status = item.status;
      return status === "pending" || status === "confirmed";
    });
  };

  useEffect(() => {
    fetchUserAppointments();
    fetchServices();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserAppointments(), fetchServices()]);
    setRefreshing(false);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("Logout Error.", error);
      router.replace("/");
    }
  };

  const handleBookingSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchUserAppointments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
            }
          >
            {/* ✅ Header: pink extends under the status bar via insets.top */}
            <View
              className="bg-pink-500 px-5 pb-8"
              style={{
                paddingTop: insets.top + 12,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
              }}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Welcome Back, {user?.first_name}! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have {upcomingCount} Upcoming Appointment(s)
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: 8,
                    borderRadius: 9999,
                  }}
                >
                  <Ionicons name="notifications-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View className="flex-row justify-between px-4 mt-6" style={{ marginTop: -25 }}>
              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Upcoming</Text>
                  <View className="bg-pink-100 p-2 rounded-full">
                    <Ionicons name="calendar" size={18} color="#ec4899" />
                  </View>
                </View>
                <Text className="text-pink-500 text-3xl font-bold mt-3">{upcomingCount}</Text>
                <Text className="text-gray-400 text-xs mt-1">Appointments</Text>
              </View>

              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Total Spent</Text>
                  <View className="bg-green-100 p-2 rounded-full">
                    <Ionicons name="cash-outline" size={18} color="#10b981" />
                  </View>
                </View>
                <Text className="text-green-600 text-3xl font-bold mt-3">₱{totalSpent.toLocaleString()}</Text>
                <Text className="text-gray-400 text-xs mt-1">All Time</Text>
              </View>
            </View>

            {/* Upcoming Appointments Section */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Upcoming Appointments</Text>
                <TouchableOpacity className="flex-row items-center" onPress={() => setActiveTab('history')}>
                  <Text className="text-pink-500 font-semibold mr-1">View All</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View className="py-10">
                  <Text className="text-center text-gray-500">Loading appointments...</Text>
                </View>
              ) : getUpcomingAppointments().length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                  <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">No upcoming appointments</Text>
                  <TouchableOpacity className="mt-4 bg-pink-500 px-6 py-2 rounded-full" onPress={() => setActiveTab('book')}>
                    <Text className="text-white font-semibold">Book Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                getUpcomingAppointments().map((item: Appointment) => {
                  const remainingBalance = calculateRemainingBalance(item.total_price);
                  const hasRemainingBalance = remainingBalance > 0 && item.has_remaining_balance !== false;
                  const isMultipleServices = item.services && item.services.length > 1;
                  const services = item.services || [];
                  const serviceNames = item.service_names || ['No Service'];

                  return (
                    <View key={item.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center">
                            <Text className="text-lg font-bold text-gray-800">
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

                          {services.length > 0 && (
                            <View className="mt-1">
                              {services.map((service, index) => (
                                <View key={index} className="flex-row items-center mt-1">
                                  <View className="w-1.5 h-1.5 bg-pink-400 rounded-full mr-2" />
                                  <Text className="text-gray-600 text-sm">
                                    {service.service_name} ({service.duration_minutes} mins) - ₱{parseFloat(service.price).toLocaleString()}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <View className="flex-row items-center mt-2">
                            <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">{formatDate(item.appointment_date)}</Text>
                          </View>

                          {item.appointment_time && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1">{formatTime(item.appointment_time)}</Text>
                            </View>
                          )}

                          <View className="flex-row items-center mt-1">
                            <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">Total: {item.total_duration} mins</Text>
                          </View>

                          {hasRemainingBalance && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="cash-outline" size={14} color="#f59e0b" />
                              <Text className="text-orange-500 text-xs ml-1 font-semibold">
                                Balance: ₱{remainingBalance.toLocaleString()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-pink-500 font-bold">₱{(item.total_price || 0).toLocaleString()}</Text>
                      </View>

                      <View className="flex-row mt-2">
                        <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status || 'pending')}`}>
                          <Text className="text-xs font-semibold capitalize">{item.status || 'pending'}</Text>
                        </View>
                        {item.service_status && item.service_status !== 'pending' && (
                          <View className="ml-2 px-2 py-1 rounded-full bg-gray-100">
                            <Text className="text-xs font-semibold capitalize text-gray-600">Service: {item.service_status}</Text>
                          </View>
                        )}
                      </View>

                      {hasRemainingBalance && (
                        <TouchableOpacity
                          className="mt-3 bg-orange-500 py-2.5 rounded-xl flex-row items-center justify-center"
                          onPress={() => handlePayBalance(item)}
                        >
                          <Ionicons name="cash-outline" size={18} color="white" />
                          <Text className="text-white font-semibold text-sm ml-2">
                            Pay Remaining Balance (₱{remainingBalance.toLocaleString()})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        );

      case 'book':
        return <CustomerBooking onBookingSuccess={handleBookingSuccess} />;

      case 'history':
        return <CustomerHistoryTab refreshTrigger={refreshTrigger} />;

      case 'settings':
        return <CustomerSettingsTab onLogout={handleLogout} />;

      default:
        return null;
    }
  };

  return (
    // ✅ edges={['bottom']} so the top inset is not applied here.
    //    That lets the pink header extend all the way under the status bar.
    // ✅ StatusBar style="light" so the status bar icons (time, battery, signal)
    //    render white against the pink background.
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <StatusBar style="light" />

      <View className="flex-1">
        {renderContent()}
      </View>

      <PaymentModal
        visible={showPaymentModal}
        appointment={selectedAppointmentForPayment}
        paymentProof={paymentProof}
        isProcessingPayment={isProcessingPayment}
        onClose={handleClosePaymentModal}
        onPickImage={pickImageFromGallery}
        onRemoveProof={() => setPaymentProof(null)}
        onConfirm={handleConfirmPayment}
        qrCodeImage={qrCodeImage}
      />

      <View className="flex-row justify-around items-center border-t border-gray-200 bg-white py-3 px-5">
        <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('home')}>
          <Ionicons name={activeTab === 'home' ? "home" : "home-outline"} size={24} color={activeTab === 'home' ? "#ec4899" : "#9ca3af"} />
          <Text className={`text-xs mt-1 ${activeTab === 'home' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('book')}>
          <Ionicons name={activeTab === 'book' ? "calendar" : "calendar-outline"} size={24} color={activeTab === 'book' ? "#ec4899" : "#9ca3af"} />
          <Text className={`text-xs mt-1 ${activeTab === 'book' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>Book</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('history')}>
          <Ionicons name={activeTab === 'history' ? "heart" : "heart-outline"} size={24} color={activeTab === 'history' ? "#ec4899" : "#9ca3af"} />
          <Text className={`text-xs mt-1 ${activeTab === 'history' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('settings')}>
          <Ionicons name={activeTab === 'settings' ? "settings" : "settings-outline"} size={24} color={activeTab === 'settings' ? "#ec4899" : "#9ca3af"} />
          <Text className={`text-xs mt-1 ${activeTab === 'settings' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}