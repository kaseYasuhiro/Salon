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

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Transaction {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name: string;
  duration_minutes: number;
  price: string;
  service_status: string;
  assigned_employee_id?: number;
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

  // Billing fields from the backend
  billing_total_amount?: number | null;
  billing_paid_amount?: number | null;
  billing_balance?: number | null;
  billing_payment_type?: string | null;

  // Stylist
  stylist_name?: string;
  stylist_id?: number;

  has_remaining_balance?: boolean;

  // ✅ Grace period
  grace_period_minutes?: number;
  grace_period_ends_at?: string | null;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  profile_image?: string;
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

// Grace status union
type GraceStatus =
  | { kind: 'upcoming'; minutesUntilStart: number }
  | { kind: 'in_grace'; minutesLeft: number }
  | { kind: 'expired' }
  | { kind: 'not_today' }
  | { kind: 'no_time' };

// ─────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────
const formatDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatLongDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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

// Get today's date as YYYY-MM-DD in device-local time
const getTodayLocalStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ✅ Helper to build the full image URL from a stored path
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/storage/')) return `http://192.168.100.73:8000${imagePath}`;
  return `http://192.168.100.73:8000/storage/${imagePath}`;
};

// ─────────────────────────────────────────────────────────────
// Receipt Modal
// ─────────────────────────────────────────────────────────────
interface ReceiptModalProps {
  visible: boolean;
  appointment: Appointment | null;
  customerName: string;
  stylistName: string;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  appointment,
  customerName,
  stylistName,
  onClose,
}) => {
  if (!appointment) return null;

  const totalAmount = appointment.billing_total_amount ?? appointment.total_price ?? 0;
  const paidAmount = appointment.billing_paid_amount ?? 0;
  const balance = appointment.billing_balance ?? (totalAmount - paidAmount);
  const services = appointment.services || [];
  const serviceNames = appointment.service_names || ['No Service'];

  const paymentStatus =
    balance <= 0 ? 'PAID IN FULL' :
    paidAmount > 0 ? 'PARTIAL PAYMENT' :
    'UNPAID';

  const statusColor =
    balance <= 0 ? '#10b981' :
    paidAmount > 0 ? '#f59e0b' :
    '#ef4444';

  const receiptNo = `RCP-${String(appointment.id).padStart(6, '0')}`;

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View
          className="bg-white rounded-2xl overflow-hidden w-full"
          style={{ minWidth: 320, maxHeight: '90%' }}
        >
          <View className="px-6 py-4 items-center" style={{ backgroundColor: '#ec4899' }}>
            <Text className="text-white text-xl font-bold">Reshel Oco Hair Salon</Text>
            <Text className="text-white opacity-90 text-sm mt-0.5">Official Appointment Receipt</Text>
            <View
              className="mt-2 px-3 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Text className="text-white text-xs font-mono">{receiptNo}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-5">
              <View
                className="rounded-xl py-2 items-center mb-4"
                style={{
                  backgroundColor: `${statusColor}20`,
                  borderWidth: 1,
                  borderColor: `${statusColor}40`,
                }}
              >
                <Text className="text-xs font-bold" style={{ color: statusColor }}>
                  {paymentStatus}
                </Text>
              </View>

              <View className="border-b border-gray-100 pb-3 mb-3">
                <Text className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
                  Customer
                </Text>
                <Text className="text-base font-bold text-gray-800">
                  {customerName || 'Customer'}
                </Text>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    {formatLongDate(appointment.appointment_date)}
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="time-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    {formatTime(appointment.appointment_time)}
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="hourglass-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    Total duration: {appointment.total_duration} mins
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="person-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    Assigned Stylist:{' '}
                    <Text className="font-semibold text-gray-800">
                      {stylistName || 'Not assigned'}
                    </Text>
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="checkmark-circle-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    Status: {appointment.status ? appointment.status.toUpperCase() : 'PENDING'}
                  </Text>
                </View>
              </View>

              <View className="border-b border-gray-100 pb-3 mb-3">
                <Text className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
                  Services ({services.length})
                </Text>
                {services.length > 0 ? (
                  services.map((svc, idx) => (
                    <View
                      key={idx}
                      className="flex-row justify-between items-start py-1"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-sm text-gray-800">{svc.service_name}</Text>
                        <Text className="text-[10px] text-gray-500">
                          {svc.duration_minutes} mins
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-700 font-medium">
                        ₱{parseFloat(svc.price).toLocaleString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-gray-500">{serviceNames.join(' + ')}</Text>
                )}
              </View>

              <View className="border-b border-gray-100 pb-3 mb-3">
                <Text className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
                  Payment Details
                </Text>

                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-sm text-gray-600">Total Amount</Text>
                  <Text className="text-sm font-semibold text-gray-800">
                    ₱{totalAmount.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-sm text-gray-600">Amount Paid</Text>
                  <Text className="text-sm font-semibold text-green-600">
                    ₱{paidAmount.toLocaleString()}
                  </Text>
                </View>

                {balance > 0 && (
                  <View className="flex-row justify-between items-center py-1">
                    <Text className="text-sm text-gray-600">Remaining Balance</Text>
                    <Text className="text-sm font-semibold text-orange-600">
                      ₱{balance.toLocaleString()}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-2 mt-1 bg-pink-50 rounded-lg px-3">
                  <Text className="text-xs font-semibold text-gray-700">
                    {balance <= 0 ? 'Payment Status' : 'Balance Due at Salon'}
                  </Text>
                  <Text
                    className="text-base font-bold"
                    style={{ color: balance <= 0 ? '#10b981' : '#ec4899' }}
                  >
                    {balance <= 0 ? 'PAID' : `₱${balance.toLocaleString()}`}
                  </Text>
                </View>
              </View>

              <View className="bg-gray-50 rounded-lg p-3 mb-4">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="information-circle-outline" size={14} color="#ec4899" />
                  <Text className="text-gray-500 text-[11px] flex-1 leading-4">
                    Please present this receipt to the staff upon arrival.
                    Look for <Text className="font-semibold text-gray-700">{stylistName || 'your stylist'}</Text> at the salon.
                    {balance > 0 && ' The remaining balance can be paid at the salon on your appointment day.'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="py-3 rounded-xl"
                style={{ backgroundColor: '#ec4899' }}
                onPress={onClose}
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Payment Modal
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
  qrImageUrl: string | null;
  gcashNumber: string | null;
  isLoadingQr: boolean;
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
  qrImageUrl,
  gcashNumber,
  isLoadingQr,
}) => {
  if (!appointment) return null;

  const totalAmount = appointment.billing_total_amount ?? appointment.total_price ?? 0;
  const paidAmount = appointment.billing_paid_amount ?? 0;
  const remainingBalance = appointment.billing_balance ?? (totalAmount - paidAmount);

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
          <View className="px-6 py-4" style={{ backgroundColor: '#ec4899' }}>
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Pay Remaining Balance</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-6">
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
                  <Text className="text-gray-800 font-bold text-sm">₱{totalAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Already Paid</Text>
                  <Text className="text-green-600 font-semibold text-sm">₱{paidAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mt-1 pt-1 border-t border-pink-200">
                  <Text className="text-gray-600 font-semibold">Remaining Balance</Text>
                  <Text className="text-orange-600 font-bold text-lg">₱{remainingBalance.toLocaleString()}</Text>
                </View>
              </View>

              {/* ✅ QR + GCash (fetched from owner's settings) */}
              <View className="items-center mb-4">
                <Text className="text-gray-700 font-semibold text-base mb-2">Pay with GCash</Text>

                {isLoadingQr ? (
                  <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md w-40 h-40 items-center justify-center">
                    <Text className="text-gray-400 text-xs">Loading QR...</Text>
                  </View>
                ) : qrImageUrl ? (
                  <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md">
                    <Image
                      source={{ uri: qrImageUrl }}
                      className="w-40 h-40"
                      resizeMode="contain"
                      onError={(e) =>
                        console.log("QR image failed:", qrImageUrl, e.nativeEvent.error)
                      }
                    />
                  </View>
                ) : (
                  <View className="bg-gray-100 rounded-xl p-6 w-40 h-40 items-center justify-center border-2 border-dashed border-gray-300">
                    <Ionicons name="qr-code-outline" size={48} color="#9ca3af" />
                    <Text className="text-gray-400 text-xs text-center mt-2">
                      QR code not available
                    </Text>
                  </View>
                )}

                <Text className="text-gray-500 text-sm mt-2 text-center">
                  Amount to pay: <Text className="font-bold text-orange-600">₱{remainingBalance.toLocaleString()}</Text>
                </Text>

                {gcashNumber ? (
                  <View className="mt-3 bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
                    <Text className="text-[10px] text-gray-500 text-center">GCash Number</Text>
                    <Text className="text-sm font-bold text-gray-800 tracking-wide text-center">
                      {gcashNumber}
                    </Text>
                  </View>
                ) : null}
              </View>

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

              <View className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="information-circle-outline" size={16} color="#eab308" />
                  <Text className="text-yellow-700 text-xs flex-1">
                    Please upload a clear screenshot of your GCash payment receipt.
                    This will be reviewed by our staff to confirm your payment.
                  </Text>
                </View>
              </View>

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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  // ✅ Live clock — updates every 30s so grace countdown stays fresh
  const [now, setNow] = useState(new Date());

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>('gcash');
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Receipt Modal States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedAppointmentForReceipt, setSelectedAppointmentForReceipt] = useState<Appointment | null>(null);

  // ✅ QR code + GCash state (fetched from the owner's config)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [gcashNumber, setGcashNumber] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const { user, logout } = useAuth();

  const insets = useSafeAreaInsets();

  // ── Fetch staff ──
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) {
        staffData = response.data.map((s: any) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          profile_image: s.profile_image,
        }));
      }
      setStaff(staffData);
      return staffData;
    } catch (error) {
      console.log("Error fetching staff:", error);
      return [];
    }
  };

  // ✅ Fetch the owner-configured QR + GCash number
  const fetchQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await api.get('/qr-code');
      const data = response.data;

      setQrImageUrl(getImageUrl(data?.qr_image || data?.qr_image_path) || null);
      setGcashNumber(data?.gcash_number || null);
      return data;
    } catch (error) {
      console.log("Error fetching QR code:", error);
      setQrImageUrl(null);
      setGcashNumber(null);
      return null;
    } finally {
      setIsLoadingQr(false);
    }
  };

  // ── Fetch user appointments ──
  const fetchUserAppointments = async (staffOverride?: StaffMember[]) => {
    setIsLoading(true);
    try {
      const response = await api.get("/appointments");
      console.log("Raw appointments response:", response.data);

      const activeStaff = staffOverride ?? staff;

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
          assigned_employee_id: item.assigned_employee_id,
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
        billing_total_amount?: number | null;
        billing_paid_amount?: number | null;
        billing_balance?: number | null;
        billing_payment_type?: string | null;
        assigned_employee_id?: number | null;
        grace_period_minutes?: number | null;
        grace_period_ends_at?: string | null;
      }>();

      transactions.forEach((transaction) => {
        const appointmentId = transaction.appointment_id;

        if (!appointmentMap.has(appointmentId)) {
          const originalData = response.data.find((item: any) => item.id === appointmentId);

          appointmentMap.set(appointmentId, {
            id: appointmentId,
            customer_id: user?.id || 0,
            appointment_date: originalData?.appointment_date || '',
            appointment_time: originalData?.appointment_time || '',
            status: originalData?.status || '',
            services: [],
            billing_total_amount: originalData?.billing_total_amount ?? null,
            billing_paid_amount: originalData?.billing_paid_amount ?? null,
            billing_balance: originalData?.billing_balance ?? null,
            billing_payment_type: originalData?.billing_payment_type ?? null,
            assigned_employee_id: originalData?.assigned_employee_id ?? null,
            grace_period_minutes: originalData?.grace_period_minutes ?? null,
            grace_period_ends_at: originalData?.grace_period_ends_at ?? null,
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
        const totalDuration = appointment.services.reduce((sum, s) => sum + s.duration_minutes, 0);

        const basePriceSum = appointment.services.reduce((sum, s) => sum + parseFloat(s.price || '0'), 0);
        const totalPrice = (appointment.billing_total_amount != null && appointment.billing_total_amount > 0)
          ? appointment.billing_total_amount
          : basePriceSum;

        const billingBalance = appointment.billing_balance ?? null;
        const hasRemainingBalance = (billingBalance != null)
          ? billingBalance > 0
          : true;

        const stylistMember = activeStaff.find(s => s.id === appointment.assigned_employee_id);
        const stylistName = stylistMember
          ? `${stylistMember.first_name} ${stylistMember.last_name}`
          : 'Not assigned';

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

          billing_total_amount: appointment.billing_total_amount ?? totalPrice,
          billing_paid_amount: appointment.billing_paid_amount ?? 0,
          billing_balance: appointment.billing_balance ?? (totalPrice / 2),
          billing_payment_type: appointment.billing_payment_type ?? 'downpayment',
          has_remaining_balance: hasRemainingBalance,

          stylist_name: stylistName,
          stylist_id: appointment.assigned_employee_id ?? undefined,

          grace_period_minutes: appointment.grace_period_minutes ?? 30,
          grace_period_ends_at: appointment.grace_period_ends_at ?? null,
        };
      });

      setAppointments(groupedAppointments);

      const upcoming = groupedAppointments.filter((item) => {
        if (isGracePeriodExpired(item, new Date())) return false;
        return item.status === "pending" || item.status === "confirmed";
      });
      setUpcomingCount(upcoming.length);

      const total = groupedAppointments
        .filter((item: Appointment) => item.service_status === "completed")
        .reduce((sum: number, item: Appointment) => {
          return sum + (item.billing_paid_amount ?? (item.total_price / 2));
        }, 0);
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

  // ── Grace period helpers ──
  const isGracePeriodExpired = (item: Appointment, ref: Date = new Date()) => {
    if (!item.grace_period_ends_at) return false;
    try {
      const end = new Date(item.grace_period_ends_at);
      return ref.getTime() > end.getTime();
    } catch {
      return false;
    }
  };

  const getGraceStatus = (item: Appointment, ref: Date = now): GraceStatus => {
    if (!item.appointment_date || !item.appointment_time || !item.grace_period_ends_at) {
      return { kind: 'no_time' };
    }

    const todayStr = getTodayLocalStr();
    if (item.appointment_date !== todayStr) {
      return { kind: 'not_today' };
    }

    const start = new Date(`${item.appointment_date}T${item.appointment_time.slice(0, 5)}:00`);
    const graceEnd = new Date(item.grace_period_ends_at);
    const refMs = ref.getTime();

    if (refMs < start.getTime()) {
      const minutes = Math.max(0, Math.round((start.getTime() - refMs) / 60000));
      return { kind: 'upcoming', minutesUntilStart: minutes };
    }
    if (refMs <= graceEnd.getTime()) {
      const minutes = Math.max(0, Math.round((graceEnd.getTime() - refMs) / 60000));
      return { kind: 'in_grace', minutesLeft: minutes };
    }
    return { kind: 'expired' };
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

  // ── Receipt handlers ──
  const handleViewReceipt = (appointment: Appointment) => {
    setSelectedAppointmentForReceipt(appointment);
    setShowReceiptModal(true);
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedAppointmentForReceipt(null);
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
      const totalAmount = selectedAppointmentForPayment.billing_total_amount
        ?? selectedAppointmentForPayment.total_price
        ?? 0;
      const paidAmount = selectedAppointmentForPayment.billing_paid_amount ?? 0;
      const remainingBalance = selectedAppointmentForPayment.billing_balance
        ?? (totalAmount - paidAmount);

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

      await api.post('/payment/remaining', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Payment Successful", "Your remaining balance has been paid. Thank you!");
      handleClosePaymentModal();
      await fetchStaff();
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

  // ✅ Grace-aware upcoming filter
  const getUpcomingAppointments = () => {
    return appointments.filter((item: Appointment) => {
      if (isGracePeriodExpired(item, now)) return false;
      return item.status === "pending" || item.status === "confirmed";
    });
  };

  // ── Effects ──
  useEffect(() => {
    const loadInitial = async () => {
      const staffData = await fetchStaff();
      await fetchUserAppointments(staffData);
      await fetchServices();
      await fetchQrCode();   // ✅ fetch QR on mount
    };
    loadInitial();
  }, []);

  // ✅ Live clock — updates `now` every 30s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // ✅ Background refetch every 2 min while on Home so backend `no_show` propagates
  useEffect(() => {
    if (activeTab !== 'home') return;
    const id = setInterval(() => {
      fetchUserAppointments();
    }, 120000);
    return () => clearInterval(id);
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const staffData = await fetchStaff();
    await Promise.all([
      fetchUserAppointments(staffData),
      fetchServices(),
      fetchQrCode(),
    ]);
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

  const handleBookingSuccess = async () => {
    setRefreshTrigger(prev => prev + 1);
    const staffData = await fetchStaff();
    await fetchUserAppointments(staffData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'no_show': return 'bg-red-100 text-red-700';
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
            {/* Header */}
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
                  const remainingBalance = item.billing_balance ?? 0;
                  const paidAmount = item.billing_paid_amount ?? 0;
                  const hasRemainingBalance = remainingBalance > 0;

                  const isMultipleServices = item.services && item.services.length > 1;
                  const services = item.services || [];
                  const serviceNames = item.service_names || ['No Service'];

                  const graceStatus = getGraceStatus(item);

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
                            <Ionicons name="person-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">
                              Stylist: <Text className="font-semibold text-gray-700">{item.stylist_name || 'Not assigned'}</Text>
                            </Text>
                          </View>

                          <View className="flex-row items-center mt-1">
                            <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">Total: {item.total_duration} mins</Text>
                          </View>

                          {paidAmount > 0 && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                              <Text className="text-green-600 text-xs ml-1">
                                Paid: ₱{paidAmount.toLocaleString()}
                              </Text>
                            </View>
                          )}
                          {hasRemainingBalance && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="cash-outline" size={14} color="#f59e0b" />
                              <Text className="text-orange-500 text-xs ml-1 font-semibold">
                                Balance: ₱{remainingBalance.toLocaleString()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-pink-500 font-bold">
                          ₱{(item.billing_total_amount ?? item.total_price ?? 0).toLocaleString()}
                        </Text>
                      </View>

                      {graceStatus.kind === 'in_grace' && (
                        <View className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2.5 flex-row items-center">
                          <Ionicons name="alarm-outline" size={16} color="#f97316" />
                          <Text className="text-orange-700 text-xs ml-2 flex-1">
                            <Text className="font-bold">Hurry!</Text>{' '}
                            You have {graceStatus.minutesLeft} min{graceStatus.minutesLeft === 1 ? '' : 's'} left
                            before this appointment is released.
                          </Text>
                        </View>
                      )}

                      {graceStatus.kind === 'upcoming' && graceStatus.minutesUntilStart <= 120 && (
                        <View className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex-row items-center">
                          <Ionicons name="time-outline" size={16} color="#3b82f6" />
                          <Text className="text-blue-700 text-xs ml-2 flex-1">
                            Your appointment starts in {graceStatus.minutesUntilStart} min{graceStatus.minutesUntilStart === 1 ? '' : 's'}.
                            Please arrive on time.
                          </Text>
                        </View>
                      )}

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

                      <View className="flex-row mt-3 gap-2">
                        <TouchableOpacity
                          className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border border-pink-500"
                          onPress={() => handleViewReceipt(item)}
                        >
                          <Ionicons name="receipt-outline" size={18} color="#ec4899" />
                          <Text className="text-pink-500 font-semibold text-sm ml-2">
                            View Receipt
                          </Text>
                        </TouchableOpacity>

                        {hasRemainingBalance && (
                          <TouchableOpacity
                            className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                            style={{ backgroundColor: '#f97316' }}
                            onPress={() => handlePayBalance(item)}
                          >
                            <Ionicons name="cash-outline" size={18} color="white" />
                            <Text className="text-white font-semibold text-sm ml-2">
                              Pay Balance
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <StatusBar style="light" />

      <View className="flex-1">
        {renderContent()}
      </View>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        appointment={selectedAppointmentForPayment}
        paymentProof={paymentProof}
        isProcessingPayment={isProcessingPayment}
        onClose={handleClosePaymentModal}
        onPickImage={pickImageFromGallery}
        onRemoveProof={() => setPaymentProof(null)}
        onConfirm={handleConfirmPayment}
        qrImageUrl={qrImageUrl}
        gcashNumber={gcashNumber}
        isLoadingQr={isLoadingQr}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        appointment={selectedAppointmentForReceipt}
        customerName={user ? `${user.first_name} ${user.last_name}` : ''}
        stylistName={selectedAppointmentForReceipt?.stylist_name || 'Not assigned'}
        onClose={handleCloseReceiptModal}
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